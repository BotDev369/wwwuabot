#!/usr/bin/env node
/**
 * Триаж прогонів: що впало, чому і що з цим робити.
 *
 * Червоний прогін сам себе не пояснює: у списку видно «Deploy — failure», а
 * причина (крок, правило, файл) лишається в логах джоби, які ніхто не відкриває.
 * Тут падіння стає **класом**: крок → причина → дія, і клас, що повторюється,
 * видно числом, а не пам'яттю. Реєстр класів — `scripts/ci-classes.mjs`; його
 * опис і правила додавання — `docs/CI_TRIAGE.md`.
 *
 * Запуск:
 *   node scripts/ci-triage.mjs             # останні прогони, коротко
 *   node scripts/ci-triage.mjs --logs      # + хвіст логу невдалого кроку
 *   node scripts/ci-triage.mjs --issue     # створити/оновити нитку в issues
 *   node scripts/ci-triage.mjs --retry     # перезапустити транзієнтні падіння
 *   node scripts/ci-triage.mjs --close     # закрити нитку після зеленого
 *   node scripts/ci-triage.mjs --strict    # код 1, якщо є падіння (для гейта)
 *
 * Потрібен `GITHUB_TOKEN` (у CI — `github.token`) і `GITHUB_REPOSITORY`.
 *
 * @module scripts/ci-triage
 */

import { CLASSES } from "./ci-classes.mjs";

const API = "https://api.github.com";
const TITLE = "CI: розбір падінь деплою";
const MARKER = "<!-- ci-triage -->";
/** Скільки разів клас мусить повторитися, щоб це вважалося системою, а не разом. */
const REPEAT_THRESHOLD = 3;

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const option = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 || !argv[i + 1] ? fallback : argv[i + 1];
};

const runsWindow = Number(option("runs", "20"));
const repo = option("repo", process.env.GITHUB_REPOSITORY || "");
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
if (!repo.includes("/")) fail("Потрібен GITHUB_REPOSITORY=owner/name або --repo owner/name.");
if (!token) fail("Потрібен GITHUB_TOKEN.");

// ── HTTP ────────────────────────────────────────────────────────────────────

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(2);
}

async function api(path, { method = "GET", body, timeout = 20000 } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(timeout),
  });
  if (res.status === 204) return null;
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

/** Лог джоби: АПІ віддає 302 на підписану адресу, `fetch` іде за нею сам. */
async function jobLog(jobId) {
  const res = await fetch(`${API}/repos/${repo}/actions/jobs/${jobId}/logs`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) return "";
  return res.text();
}

// ── Розбір ──────────────────────────────────────────────────────────────────

function classify(job, step) {
  return CLASSES.find((c) => (!c.job || c.job.test(job.name)) && c.step.test(step.name));
}

/**
 * Хвіст логу невдалого кроку: без дат, ANSI й прибирання раннера.
 *
 * Два маркери кінця кроку: `Process completed with exit code` — штатна невдача,
 * `Post job cleanup.` — те, що лишається після таймауту. Без обрізу хвіст — це
 * `git config` прибиральника, і справжня помилка в ньому не видна.
 */
function logTail(text, limit = 14) {
  const lines = text
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z\s?/gm, "")
    .replace(/\r/g, "")
    .split("\n");
  const cut = lines.findIndex((l) =>
    /Process completed with exit code|^Post job cleanup\./.test(l),
  );
  return (cut === -1 ? lines : lines.slice(0, cut))
    .map((l) => l.trimEnd())
    .filter((l) => l.trim() && !/^##\[(group|endgroup|debug|error)\]|^\[command\]/.test(l))
    .slice(-limit);
}

async function triageRun(run) {
  const { jobs } = await api(`/repos/${repo}/actions/runs/${run.id}/jobs?per_page=100`);
  const broken = jobs.filter((j) => j.conclusion === "failure" || j.conclusion === "timed_out");
  const findings = [];
  for (const job of broken) {
    const step =
      job.steps?.find((s) => s.conclusion === "failure") ||
      job.steps?.find((s) => s.conclusion === "timed_out");
    const cls = step ? classify(job, step) : undefined;
    findings.push({
      run: run.id,
      head: run.head_sha,
      sha: run.head_sha.slice(0, 7),
      url: run.html_url,
      event: run.event,
      attempt: run.run_attempt,
      job: job.name,
      step: step?.name ?? "—",
      classId: cls?.id ?? (job.conclusion === "timed_out" ? "timeout" : "unknown"),
      transient: Boolean(cls?.transient),
    });
  }
  if (!findings.length) {
    findings.push({
      run: run.id,
      head: run.head_sha,
      sha: run.head_sha.slice(0, 7),
      url: run.html_url,
      classId: "unknown",
      job: "—",
      step: "—",
    });
  }
  return findings;
}

/** Хвіст логу — лише для першого падіння кожного прогону: решта повторює те саме. */
async function attachLogs(findings, runs) {
  const seen = new Set();
  for (const item of findings) {
    if (seen.has(item.run)) continue;
    seen.add(item.run);
    if (item.classId !== "unknown" && !flag("logs")) continue;
    const { jobs } = await api(`/repos/${repo}/actions/runs/${item.run}/jobs?per_page=100`);
    const job = jobs.find((j) => j.name === item.job && j.conclusion !== "success");
    if (!job) continue;
    item.tail = logTail(await jobLog(job.id), 14);
  }
  return runs;
}

// ── Вивід ───────────────────────────────────────────────────────────────────

function byClass(findings) {
  const groups = new Map();
  for (const f of findings) {
    if (!groups.has(f.classId)) groups.set(f.classId, []);
    groups.get(f.classId).push(f);
  }
  return [...groups.entries()]
    .map(([id, items]) => ({
      id,
      items,
      count: items.length,
      cls: CLASSES.find((c) => c.id === id),
    }))
    .sort((a, b) => b.count - a.count);
}

function report(runs, failed, findings) {
  const total = runs.length;
  const head = `Прогонів: ${total}, з них впали: ${failed.length}`;
  if (!failed.length) {
    console.log(`✓ ${head}. Розбирати нічого.`);
    return;
  }
  console.log(`\n${head} (${Math.round((failed.length / total) * 100)}%).`);
  for (const g of byClass(findings)) {
    const mark = g.count >= REPEAT_THRESHOLD ? " ← система, не раз" : "";
    console.log(`\n  ${g.id} — ${g.count}${mark}`);
    console.log(`    причина:   ${g.cls?.cause ?? "клас не описано в CLASSES"}`);
    console.log(`    лікування: ${g.cls?.fix ?? "додати клас у scripts/ci-triage.mjs"}`);
    const last = g.items[0];
    console.log(
      `    останній:  ${last.sha} · ${last.job} › ${last.step}\n               ${last.url}`,
    );
    for (const line of last.tail ?? []) console.log(`      │ ${line}`);
  }
  console.log("");
}

function issueBody(runs, failed, findings) {
  const rows = byClass(findings)
    .map((g) => {
      const system = g.count >= REPEAT_THRESHOLD ? "**система**" : "раз";
      return `| \`${g.id}\` | ${g.count} (${system}) | ${g.cls?.cause ?? "клас не описано"} | ${g.cls?.fix ?? "додати клас у \`scripts/ci-triage.mjs\`"} |`;
    })
    .join("\n");
  const recent = failed
    .slice(0, 5)
    .map((r) => `- [\`${r.head_sha.slice(0, 7)}\`](${r.html_url}) — ${r.conclusion} · ${r.name}`)
    .join("\n");
  return `${MARKER}
Автоматичний розбір останніх ${runs.length} прогонів «Deploy»: **${failed.length} впали**.
Нитку оновлює \`.github/workflows/ci-triage.yml\`, закриває — перший зелений прогін.
Класи й лікування — \`docs/CI_TRIAGE.md\`; реєстр — \`scripts/ci-triage.mjs\`.

| Клас | Разів | Причина | Що робити |
|---|---|---|---|
${rows}

Останні падіння:
${recent}
`;
}

/**
 * Нитка триажу — одна на репозиторій; канонічна та, що створена раніше.
 *
 * Пошук із повтором: список issues у GitHub оновлюється з затримкою, і одразу
 * після створення нитка ще не видна — без повтору кожен прогін плодив би нову.
 * Зайві нитки скрипт закриває сам: дублікат — теж шум, який треба прибирати.
 */
async function findIssues() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const open = await api(`/repos/${repo}/issues?state=open&per_page=100`);
    const found = open.filter((i) => i.title === TITLE && !i.pull_request);
    if (found.length) return found.sort((a, b) => a.number - b.number);
    if (attempt < 2) await new Promise((r) => setTimeout(r, 3000));
  }
  return [];
}

async function closeIssue(issue) {
  await api(`/repos/${repo}/issues/${issue.number}`, {
    method: "PATCH",
    body: { state: "closed" },
  });
}

async function syncIssue(body, close) {
  const found = await findIssues();
  if (close) {
    if (!found.length) return console.log("✓ Нитки немає — закривати нічого.");
    for (const issue of found) await closeIssue(issue);
    console.log(`✓ Нитку ${found.map((i) => `#${i.number}`).join(", ")} закрито: деплой зелений.`);
    return;
  }
  const [canonical, ...duplicates] = found;
  for (const duplicate of duplicates) {
    await closeIssue(duplicate);
    console.log(`✓ Дублікат #${duplicate.number} закрито, жива нитка — #${canonical.number}.`);
  }
  if (canonical) {
    await api(`/repos/${repo}/issues/${canonical.number}`, { method: "PATCH", body: { body } });
    console.log(`✓ Нитку #${canonical.number} оновлено.`);
  } else {
    const created = await api(`/repos/${repo}/issues`, {
      method: "POST",
      body: { title: TITLE, body },
    });
    console.log(`✓ Нитку #${created.number} створено: ${created.html_url}`);
  }
}

/**
 * Перезапуск лише транзієнтних падінь і лише один раз на прогін.
 *
 * Тільки для голови `main`: Cloudflare пише останнім, хто встиг, тож перезапуск
 * деплою старого коміта — це відкат прода, а не лікування флейка.
 */
async function retryTransient(findings) {
  const retried = new Set();
  const { object: head } = await api(`/repos/${repo}/git/ref/heads/main`);
  for (const f of findings) {
    if (!f.transient || f.attempt >= 2 || retried.has(f.run)) continue;
    if (f.head !== head.sha) {
      console.log(`— Пропущено ${f.sha}: це не голова main, перезапуск відкотив би прод.`);
      continue;
    }
    retried.add(f.run);
    await api(`/repos/${repo}/actions/runs/${f.run}/rerun-failed-jobs`, { method: "POST" });
    console.log(`↻ Перезапущено невдалі джоби прогону ${f.sha} (${f.classId}).`);
  }
  if (!retried.size) console.log("↻ Перезапускати нічого: падіння не транзієнтні.");
}

// ── Головне ─────────────────────────────────────────────────────────────────

async function main() {
  if (flag("close")) {
    try {
      await syncIssue("", true);
    } catch (error) {
      console.error(`✗ Нитку не закрито: ${error.message}`);
      process.exitCode = 2;
    }
    return;
  }
  const { workflow_runs: runs } = await api(
    `/repos/${repo}/actions/runs?per_page=${Math.min(runsWindow, 100)}`,
  );
  if (!runs.length) fail("Прогонів не знайдено.");
  const failed = runs.filter((r) => r.conclusion === "failure");
  const findings = (await Promise.all(failed.map(triageRun))).flat();
  await attachLogs(findings, runs);

  if (flag("json"))
    console.log(JSON.stringify({ runs: runs.length, failed: failed.length, findings }, null, 2));
  else report(runs, failed, findings);

  if (flag("issue")) {
    try {
      await syncIssue(issueBody(runs, failed, findings), false);
    } catch (error) {
      console.error(`✗ Нитку не оновлено: ${error.message}`);
      process.exitCode = 2;
    }
  }
  if (flag("retry")) await retryTransient(findings);
  process.exitCode = failed.length && flag("strict") ? 1 : 0;
}

await main();
