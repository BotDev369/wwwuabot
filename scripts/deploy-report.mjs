#!/usr/bin/env node
/**
 * Звіт про деплой від агента: збирає факти прогону й віддає їх ботові.
 *
 * Запускається останньою джобою `Deploy` (`if: always()`), тож звіт приходить і
 * тоді, коли деплой червоний — саме тоді він і потрібен. Ні токена бота, ні
 * секрета тут немає: право писати дає OIDC-токен, який GitHub видає джобі на
 * хвилини, а воркер перевіряє його підпис і твердження.
 *
 * Слова звіту живуть у шаблоні `/report` у D1, а «що змінилось» і «що не
 * перевірено» беруться з тіла коміта: рядки `- …` і блок після `Limits:`.
 *
 * Запуск: `node scripts/deploy-report.mjs` (у CI). Локально нічого не робить,
 * якщо немає `REPORT_URL` — це нормальний режим «без каналу».
 *
 * @module scripts/deploy-report
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const url = process.env.REPORT_URL;
const key = process.env.AGENT_REPORT_KEY;
const AUDIENCE = "wwwuabot-deploy-report";

/** OIDC-токен джоби: живe хвилини й підписаний GitHub, тому його не крадуть. */
async function oidcToken() {
  const endpoint = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const bearer = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!endpoint || !bearer) return null;
  try {
    const response = await fetch(`${endpoint}&audience=${encodeURIComponent(AUDIENCE)}`, {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data?.value === "string" ? data.value : null;
  } catch {
    return null;
  }
}

/** `git` із детермінованим результатом: у CI чекаут є, локально — тихо. */
function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function needs() {
  try {
    const parsed = JSON.parse(process.env.NEEDS_JSON ?? "{}");
    return Object.entries(parsed).map(([name, job]) => ({
      name,
      status: String(job?.result ?? "skipped"),
    }));
  } catch {
    return [];
  }
}

/** Гейти, які реально стоять у пайплайні: джерело — сам `deploy.yml`. */
function gates() {
  try {
    const workflow = readFileSync(".github/workflows/deploy.yml", "utf8");
    const found = new Set();
    for (const match of workflow.matchAll(/npm run (check:[a-z-]+)/g)) found.add(match[1]);
    return [...found];
  } catch {
    return [];
  }
}

/** `12 files changed, 340 insertions(+), 12 deletions(-)` → числа. */
function diffstat() {
  const raw = git(["diff", "--shortstat", "HEAD~1", "HEAD"]);
  const number = (re) => Number(re.exec(raw)?.[1] ?? 0);
  return {
    files: number(/(\d+) files? changed/),
    added: number(/(\d+) insertions?/),
    removed: number(/(\d+) deletions?/),
  };
}

/** Тіло коміта: пункти — «що змінилось», блок `Limits:` — «що не перевірено». */
function commitBody() {
  const body = git(["log", "-1", "--pretty=%B"]);
  const notes = [];
  const limitations = [];
  let inLimits = false;
  for (const line of body.split("\n").map((value) => value.trim())) {
    if (/^Limits:/i.test(line)) {
      inLimits = true;
      const rest = line.replace(/^Limits:\s*/i, "");
      if (rest) limitations.push(rest);
      continue;
    }
    if (!line) continue;
    if (inLimits) {
      limitations.push(line.replace(/^[-*]\s*/, ""));
      continue;
    }
    if (/^[-*]\s+/.test(line)) notes.push(line.replace(/^[-*]\s+/, ""));
  }
  return { notes: notes.slice(0, 6), limitations: limitations.slice(0, 6) };
}

function payload() {
  const jobs = needs();
  const server = process.env.GITHUB_SERVER_URL ?? "https://github.com";
  const repo = process.env.GITHUB_REPOSITORY ?? "BotDev369/wwwuabot";
  const sha = process.env.GITHUB_SHA ?? git(["rev-parse", "HEAD"]);
  const runId = process.env.GITHUB_RUN_ID ?? "0";
  const body = commitBody();
  const failed = jobs.some((job) => job.status !== "success");

  return {
    run_id: runId,
    status: failed ? "failure" : "success",
    sha,
    branch: process.env.GITHUB_REF_NAME ?? "main",
    repo,
    run_url: `${server}/${repo}/actions/runs/${runId}`,
    commit_url: `${server}/${repo}/commit/${sha}`,
    jobs,
    gates: gates(),
    commit: {
      subject: git(["log", "-1", "--pretty=%s"]) || "no commit",
      author: git(["log", "-1", "--pretty=%an"]) || "unknown",
      ...diffstat(),
    },
    notes: body.notes,
    limitations: body.limitations,
    platform_url: process.env.PLATFORM_URL ?? "",
  };
}

async function main() {
  if (!url) {
    console.log("deploy-report: REPORT_URL is not set, nothing to send");
    return;
  }
  const token = await oidcToken();
  if (!token && !key) {
    console.log("deploy-report: no OIDC token and no key, nothing to send");
    return;
  }

  const headers = { "Content-Type": "application/json" };
  if (key) headers["X-Report-Key"] = key;

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ ...payload(), token }),
  });
  const text = await response.text();
  console.log(`deploy-report: ${response.status} ${text.slice(0, 300)}`);
}

main().catch((error) => {
  // Звіт не має права зірвати деплой, який уже стався.
  console.warn(`deploy-report: failed — ${String(error)}`);
});
