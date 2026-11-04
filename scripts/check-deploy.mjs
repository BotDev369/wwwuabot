#!/usr/bin/env node
/**
 * Доказ, що деплой справді відбувся: run `Deploy` для цього SHA — зелений.
 *
 * Локальні гейти нічого не доводять про прод. Цей скрипт дивиться саме
 * workflow з іменем `Deploy` і саме на потрібний коміт, вимагає успіху
 * кожного job, а тоді ще й торкає живий воркер. Код виходу 0 — єдине
 * право сказати «готово».
 * @module scripts/check-deploy
 */

import { execFileSync } from "node:child_process";

const API = "https://api.github.com";
const WORKFLOW = "Deploy";
const REQUIRED_JOBS = ["checks", "deploy-bot", "deploy-api", "deploy-web-admin", "deploy-web"];
const HEALTH = "https://api-dev.diskomate.workers.dev/health";
const GATED = "https://api-dev.diskomate.workers.dev/api/admin/spending/overview";

/** Аргументи: `--sha=…`, `--wait=<хвилини>`, `--no-health`. */
const args = process.argv.slice(2);
const shaArg = args.find((a) => a.startsWith("--sha="))?.slice(6);
const waitMin = Number(args.find((a) => a.startsWith("--wait="))?.slice(7) ?? 15);
const skipHealth = args.includes("--no-health");

function git(...rest) {
  return execFileSync("git", rest, { encoding: "utf8" }).trim();
}

const repo =
  process.env.GITHUB_REPOSITORY ??
  git("remote", "get-url", "origin")
    .replace(/^.*github\.com[/:]/, "")
    .replace(/\.git$/, "");
const sha = shaArg ?? git("rev-parse", "HEAD");
const token = process.env.GITHUB_TOKEN;
if (!token) {
  console.error("✗ Немає GITHUB_TOKEN — статус деплою не перевірити.");
  process.exit(1);
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/vnd.github+json",
      "user-agent": "wwwuabot-check-deploy",
    },
  });
  if (!res.ok) throw new Error(`${res.status} на ${url}`);
  return res.json();
}

async function findRun() {
  const data = await getJson(`${API}/repos/${repo}/actions/runs?per_page=30`);
  return data.workflow_runs.find(
    (run) => run.name === WORKFLOW && run.head_sha.toLowerCase().startsWith(sha.toLowerCase()),
  );
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = Date.now() + waitMin * 60_000;

console.log(`Деплой ${repo}@${sha.slice(0, 7)} — чекаю run «${WORKFLOW}» (до ${waitMin} хв)`);

let run = await findRun();
while ((!run || run.status !== "completed") && Date.now() < deadline) {
  await sleep(20_000);
  run = (await findRun()) ?? run;
  if (run && run.status !== "completed") console.log(`  … ${run.status}`);
}

if (!run) {
  console.error(`✗ Немає run «${WORKFLOW}» для ${sha.slice(0, 7)} — пуш не дійшов або SHA інший.`);
  process.exit(1);
}
if (run.status !== "completed") {
  console.error(`✗ Run ${run.id} досі ${run.status} після ${waitMin} хв: ${run.html_url}`);
  process.exit(1);
}

const { jobs } = await getJson(`${API}/repos/${repo}/actions/runs/${run.id}/jobs`);
const byName = new Map(jobs.map((job) => [job.name, job]));
const problems = [];

for (const name of REQUIRED_JOBS) {
  const job = byName.get(name);
  if (!job) {
    problems.push(`${name}: job відсутній`);
    continue;
  }
  if (job.conclusion !== "success") {
    problems.push(`${name}: ${job.conclusion ?? job.status}`);
  }
}

console.log(`Run ${run.id}: ${run.conclusion} (${run.html_url})`);
for (const job of jobs) console.log(`  ${job.conclusion === "success" ? "✓" : "✗"} ${job.name}`);

if (run.conclusion !== "success" || problems.length > 0) {
  for (const line of problems) console.error(`✗ ${line}`);
  console.error("✗ Деплой не підтверджено — завдання не виконане.");
  process.exit(1);
}

if (!skipHealth) {
  for (const [url, expected] of [
    [HEALTH, 200],
    [GATED, 401],
  ]) {
    const res = await fetch(url, { redirect: "manual" });
    const ok = res.status === expected;
    console.log(`  ${ok ? "✓" : "✗"} ${url} → ${res.status} (очікували ${expected})`);
    if (!ok) {
      console.error("✗ Воркер відповідає не так, як має після деплою.");
      process.exit(1);
    }
  }
}

console.log(`✓ Деплой підтверджено: ${sha.slice(0, 7)} живе, гейти зелені, воркер відповідає.`);
