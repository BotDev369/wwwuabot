#!/usr/bin/env node
/**
 * Після пушу в `main`: дочекатись run «Deploy» для цього коміту й довести, що
 * він зелений.
 *
 * **Навіщо окремий скрипт.** Локальний `verify` нічого не каже про те, що
 * поїхало на воркери: пуш може пройти, а деплой — упасти на кроці, якого
 * локально не було. Перевірка «подивись у GitHub» трималась на памʼяті, а
 * памʼять — не механізм. Тому після пушу запускається цей шлях:
 *
 * 1. дочекатись, що `origin/main` справді вказує на цей коміт (максимум 5 хв) —
 *    інакше перевірявся б коміт, якого на сервері немає;
 * 2. віддати роботу `scripts/check-deploy.mjs`: він чекає run `Deploy` саме для
 *    цього SHA, вимагає успіху кожного job і торкає живий воркер;
 * 3. записати результат у `.git/deploy-last.json` і в лог —
 *    щоб «деплой зелений» було видно навіть після закриття термінала.
 *
 * **Хто його кличе.** `.githooks/pre-push` запускає його у фоні (`--detach`)
 * після того, як пропустив пуш, а `npm run push` — у тому ж терміналі. Тобто
 * пуш і перевірка деплою — одна дія, а не дві, про які треба памʼятати.
 *
 * Код виходу: 0 — деплой підтверджено; будь-що інше — ні. `--detach` завжди
 * повертає 0: фоновий сторож не має ламати пуш.
 *
 * @module scripts/watch-deploy
 */

import { execFileSync, spawn } from "node:child_process";
import { appendFileSync, openSync, writeFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { ROOT } from "./lib/files.mjs";

const args = process.argv.slice(2);
const shaArg = args.find((a) => a.startsWith("--sha="))?.slice("--sha=".length);
const detach = args.includes("--detach");

/** Гілка, за деплоєм якої стежимо: інші гілки нічого не деплоять. */
const BRANCH = "main";
/** Скільки чекати, поки коміт зʼявиться на сервері. */
const REF_WAIT_MS = 5 * 60_000;
const REF_POLL_MS = 10_000;

const git = (...rest) =>
  execFileSync("git", rest, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

const rawGitDir = git("rev-parse", "--git-dir").trim();
// У worktree (як у хмарі) `rev-parse` віддає абсолютний шлях, у звичайній
// копії — `.git`; тому шлях не можна просто склеїти з коренем.
const gitDir = isAbsolute(rawGitDir) ? rawGitDir : join(ROOT, rawGitDir);
const logPath = join(gitDir, "deploy-watch.log");
const statePath = join(gitDir, "deploy-last.json");

const sha = shaArg ?? git("rev-parse", "HEAD").trim();

function log(line) {
  const stamped = `[${new Date().toISOString()}] ${line}`;
  console.log(stamped);
  try {
    appendFileSync(logPath, `${stamped}\n`);
  } catch {
    /* лог — зручність, а не умова роботи */
  }
}

function record(ok, extra = {}) {
  try {
    writeFileSync(statePath, `${JSON.stringify({ sha, branch: BRANCH, ok, ...extra }, null, 2)}\n`);
  } catch {
    /* те саме: файл лише для того, щоб результат було де згадати */
  }
}

// Фоновий сторож: пуш не має чекати деплой, але й не має лишатися без нього.
if (detach) {
  const fd = openSync(logPath, "a");
  const child = spawn(process.execPath, [process.argv[1], `--sha=${sha}`], {
    cwd: ROOT,
    detached: true,
    stdio: ["ignore", fd, fd],
  });
  child.unref();
  console.log(`… стежу за Deploy для ${sha.slice(0, 7)} у фоні: ${logPath}`);
  process.exit(0);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Чи вказує `origin/main` на цей коміт: `true`/`false`, `null` — спитати не
 * вдалося (немає доступу до сервера — тоді вирішує `check-deploy`).
 */
function remoteHasCommit() {
  try {
    const out = git("ls-remote", "origin", `refs/heads/${BRANCH}`);
    const remote = out.split(/\s+/)[0] ?? "";
    return remote.toLowerCase().startsWith(sha.toLowerCase());
  } catch {
    return null;
  }
}

log(`Пуш ${sha.slice(0, 7)} — чекаю, поки коміт зʼявиться на origin/${BRANCH}`);

let landed = remoteHasCommit();
const refDeadline = Date.now() + REF_WAIT_MS;
while (landed === false && Date.now() < refDeadline) {
  await sleep(REF_POLL_MS);
  landed = remoteHasCommit();
}

if (landed === false) {
  log(`✗ Коміт ${sha.slice(0, 7)} не зʼявився на origin/${BRANCH} за 5 хв — пуш не дійшов.`);
  record(false, { stage: "push" });
  process.exit(1);
}
if (landed === null) log("… origin недоступний — перевіряю run за SHA (це вирішить check-deploy)");

const result = spawn(process.execPath, ["scripts/check-deploy.mjs", `--sha=${sha}`], {
  cwd: ROOT,
  stdio: "inherit",
  env: process.env,
});

result.on("exit", (code) => {
  const ok = code === 0;
  if (ok) log(`✓ Деплой ${sha.slice(0, 7)} підтверджено.`);
  else log(`✗ Деплой ${sha.slice(0, 7)} не підтверджено (код ${code ?? "?"}).`);
  record(ok, { stage: "deploy", code });
  process.exit(code ?? 1);
});
