#!/usr/bin/env node
/**
 * Швидкий цикл: перевіряє **змінене**, а не весь репозиторій.
 *
 * Це не гейт і не заміна `npm run verify`: штамп пушу пише лише повний прогін
 * кроків джоби `checks` (`scripts/verify-stamp.mjs`). Призначення інше — за
 * десятки секунд побачити, що змінений файл не ламає формат, лінт, типи,
 * документи й тести, які від нього залежать, щоб повний прогін запускати вже
 * на чистому дереві, а не як першу перевірку.
 *
 * Межа береться від `merge-base` з `origin/main`: у набір потрапляє і
 * незакомічене, і вже закомічене, але ще не запушене.
 *
 * @module scripts/check-fast
 */

import { execFileSync, spawnSync } from "node:child_process";

/** Каталоги воркспейсів: за ними визначається, чиї типи й лінт перевіряти. */
const WORKSPACES = [
  "packages/shared",
  "packages/ui",
  "bot-dev",
  "api-dev",
  "web-platform-dev",
  "web-admin-dev",
];

/** Розширення, які знає Prettier: решта (SQL, знімки) не його справа. */
const PRETTIER = /\.(md|ts|tsx|js|mjs|cjs|json|jsonc|css|html|ya?ml)$/;

/** Кроки, які не залежать від збірки: секунди, а ловлять дрейф раніше за CI. */
const GATES = [
  "check:css",
  "check:inline",
  "check:style",
  "check:quality",
  "check:docs",
  "check:db",
  "check:comments",
  "check:texts",
  "check:screens",
];

const git = (args) =>
  execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

/** База порівняння: спільний предок із `origin/main`, інакше `HEAD`. */
function base() {
  try {
    git(["rev-parse", "--verify", "--quiet", "origin/main"]);
    return git(["merge-base", "HEAD", "origin/main"]).trim() || "HEAD";
  } catch {
    return "HEAD";
  }
}

/** Змінені й нові файли; видалені не перевіряють — їх уже немає. */
function changedFiles() {
  const tracked = git(["diff", "--name-only", "--diff-filter=ACMR", "-z", base()]).split("\0");
  const untracked = git(["ls-files", "--others", "--exclude-standard", "-z"]).split("\0");
  return [...new Set([...tracked, ...untracked].filter(Boolean))];
}

const ownerOf = (file) =>
  WORKSPACES.find((dir) => file === dir || file.startsWith(`${dir}/`)) ?? null;

const time = (ms) => (ms < 1000 ? `${ms} мс` : `${(ms / 1000).toFixed(1)} с`);

/** Один крок: `true` — зелено, `false` — червоно (решта кроків не біжить). */
function step(label, command, args, cwd) {
  const startedAt = Date.now();
  process.stdout.write(`\n▶ ${label}\n`);
  const status = spawnSync(command, args, { stdio: "inherit", cwd }).status;
  const spent = time(Date.now() - startedAt);
  if (status !== 0) {
    console.error(`\n✗ ${label} — ${spent}. У повному гейті цей крок теж червоний.`);
    return false;
  }
  console.log(`✓ ${label} — ${spent}`);
  return true;
}

const files = changedFiles();

if (files.length === 0) {
  console.log("✓ Змін немає — швидкому циклу нічого перевіряти.");
  process.exit(0);
}

const code = files.filter((f) => /\.(ts|tsx)$/.test(f));
const text = files.filter((f) => PRETTIER.test(f));
const owners = [...new Set(files.map(ownerOf).filter(Boolean))];

console.log(
  `▶ Змінено ${files.length} файл(ів)` +
    (owners.length ? ` у ${owners.join(", ")}` : "") +
    `; база — ${base().slice(0, 7)}`,
);

const startedAt = Date.now();
const steps = [];

// Формат — по змінених файлах: повний `prettier --check .` лишається в гейті.
if (text.length > 0 && text.length <= 200) {
  steps.push(["prettier (змінені)", "npx", ["prettier", "--check", ...text]]);
} else if (text.length > 200) {
  steps.push(["prettier (увесь репозиторій)", "npx", ["prettier", "--check", "."]]);
}

// Лінт — у конфігу власника файлу: кореневий конфіг навмисно ігнорує оболонки.
for (const dir of owners) {
  // Шляхи — від кореня репозиторію, а `eslint` біжить у каталозі воркспейсу.
  const own = code.filter((f) => ownerOf(f) === dir).map((f) => f.slice(dir.length + 1));
  if (own.length > 0) steps.push([`eslint (${dir})`, "npx", ["eslint", ...own], dir]);
}

// Типи — лише зачеплені воркспейси; спільний пакет тягне за собою всіх споживачів.
if (owners.some((dir) => dir.startsWith("packages/"))) {
  steps.push(["typecheck (усі: змінено спільний пакет)", "npm", ["run", "typecheck"]]);
} else {
  for (const dir of owners) {
    steps.push([`typecheck (${dir})`, "npm", ["run", "typecheck"], dir]);
  }
}

for (const gate of GATES) steps.push([gate, "npm", ["run", gate]]);

// Тести — ті, що імпортують змінений код: саме їх ламає правка.
if (code.length > 0) {
  steps.push(["тести (повʼязані)", "npx", ["vitest", "related", "--run", ...code]]);
}

for (const [label, command, args, cwd] of steps) {
  if (!step(label, command, args, cwd)) process.exit(1);
}

console.log(`\n✓ Швидкий цикл зелений за ${time(Date.now() - startedAt)}.`);
console.log("! Це не гейт: пуш відкриває лише повний `npm run verify` (усі кроки `checks`).");
