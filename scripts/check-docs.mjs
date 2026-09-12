#!/usr/bin/env node
/**
 * Гейт документації — те саме, що `check:css` для класів, але для документів.
 *
 * Навіщо: документи цього репозиторію розрослись в одне полотно
 * (`CONSOLIDATION_LOG.md` — 1 235 рядків / 103 KB), і правити його було неможливо:
 * довгий якір у великому файлі не зіставляється байт-у-байт, причому мовчки.
 * Далі це не повернеться, бо три речі перевіряються машинно:
 *
 *   1. Розмір: `.md` > 400 рядків — помилка, > 200 — попередження
 *      (правило кристалевості, `AGENTS.md` §3, тепер і для документів).
 *   2. Мертві відносні посилання: `[текст](./шлях.md)` мусить існувати.
 *      Досить було поділити документ на частини, щоб лінки почали бити в нікуди.
 *   3. Живі посилання § з коду: коментарі посилаються на «LOG §5.4». Після поділу
 *      ці номери живуть у покажчику, тож перевіряється, що кожен § справді
 *      згаданий у `docs/CONSOLIDATION_LOG.md` або як заголовок у `docs/log/`.
 *
 * Запуск: `npm run check:docs` (той самий крок у CI).
 */

import { statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { ROOT, read, readLines, walk, WORKSPACES } from "./lib/files.mjs";

const MAX_LINES = 200;
const CRITICAL_LINES = 400;

/** Джерело правди про документацію — індекс і журнал. */
const INDEX = "docs/CONSOLIDATION_LOG.md";
const LOG_DIR = "docs/log";

/** Кореневі документи, які теж мусять бути читабельними. */
const ROOT_DOCS = ["AGENTS.md", "README.md", "CONTRIBUTING.md"];

/**
 * `AGENTS.md` — єдиний файл інструкцій для агентів: його не можна поділити, бо
 * його читають повністю одним файлом. Тому поріг 400 для нього діє (помилка),
 * а попередження на 200 — ні. Це єдиний виняток, і він навмисний.
 */
const SIZE_EXEMPT_WARN = new Set(["AGENTS.md"]);

const errors = [];
const warnings = [];

// ── 1. Розмір документів ──────────────────────────────────────────────────

const docs = [...walk("docs", (p) => p.endsWith(".md")), ...ROOT_DOCS.filter((f) => statSafe(f))];

const sizes = docs
  .map((file) => ({ file, lines: readLines(file).length }))
  .sort((a, b) => b.lines - a.lines);

for (const { file, lines } of sizes) {
  if (lines > CRITICAL_LINES) {
    errors.push(
      `${file} — ${lines} рядків (> ${CRITICAL_LINES}). Поділи на частини й зроби покажчик.`,
    );
  } else if (lines > MAX_LINES && !SIZE_EXEMPT_WARN.has(file)) {
    warnings.push(`${file} — ${lines} рядків (> ${MAX_LINES}).`);
  }
}

// ── 2. Мертві відносні посилання ──────────────────────────────────────────

const LINK_RE = /\[[^\]]*\]\(([^)\s]+)\)/g;

for (const file of docs) {
  const text = read(file);
  text.split("\n").forEach((line, i) => {
    for (const m of line.matchAll(LINK_RE)) {
      const href = m[1];
      if (/^(https?:|mailto:|#)/.test(href)) continue;
      const target = href.split("#")[0];
      if (!target) continue;
      const abs = normalize(join(ROOT, dirname(file), target));
      if (!existsAt(abs)) {
        errors.push(`${file}:${i + 1} — посилання «${href}» не існує (мертве).`);
      }
    }
  });
}

// ── 3. Посилання «§N» з коду мусять десь жити ──────────────────────────────

/** Усі адреси §, які мають дім: з покажчика та з заголовків частин. */
const addressed = new Set();

for (const m of read(INDEX).matchAll(
  /§\s*([\d]+(?:\.[\d]+)*)(?:\s*[–-]\s*§?\s*([\d]+(?:\.[\d]+)*))?/g,
)) {
  const from = m[1];
  addressed.add(from);
  if (m[2]) addressed.add(m[2]);
  if (m[2]) for (const mid of expand(from, m[2])) addressed.add(mid);
}

for (const part of walk(LOG_DIR, (p) => p.endsWith(".md"))) {
  for (const line of readLines(part)) {
    const m = /^#{1,3}\s+§?\s*([\d]+(?:\.[\d]+)*)\./.exec(line);
    if (m) addressed.add(m[1]);
  }
}

/** § в коді: `docs/CONSOLIDATION_LOG.md §5.4`, `LOG §3.3`. */
const codeFiles = [
  ...WORKSPACES.flatMap((w) => walk(join(w, "src"), (p) => /\.tsx?$/.test(p))),
  ...walk("scripts", (p) => p.endsWith(".mjs")),
];

for (const file of codeFiles) {
  const lines = readLines(file);
  lines.forEach((line, i) => {
    const m = /CONSOLIDATION_LOG\.md`?\s*§\s*([\d]+(?:\.[\d]+)*)/.exec(line);
    if (!m) return;
    if (!covered(m[1], addressed)) {
      errors.push(
        `${file}:${i + 1} — посилання на §${m[1]} веде в нікуди: у ${INDEX} немає ні цього §, ні його розділу.`,
      );
    }
  });
}

// ── Звіт ──────────────────────────────────────────────────────────────────

if (errors.length) {
  console.error("✗ Документація не пройшла перевірку:\n");
  for (const e of errors) console.error(`  ${e}`);
  console.error(
    "\nВиправлення: поділи документ на частини й додай рядок у покажчик `docs/CONSOLIDATION_LOG.md`;\n" +
      "куди саме писати нове — `docs/README.md`.\n",
  );
  process.exitCode = 1;
} else {
  if (warnings.length) {
    console.log("⚠ Попередження (не блокує):");
    for (const w of warnings) console.log(`  ${w}`);
    console.log("");
  }
  console.log(
    `✓ Документація: файлів ${sizes.length}, найбільший ${sizes[0].lines} рядків; ` +
      `мертвих посилань 0, § без дому 0 (адрес у покажчику: ${addressed.size}).`,
  );
}

// ── дрібні хелпери ────────────────────────────────────────────────────────

function statSafe(rel) {
  try {
    return statSync(join(ROOT, rel)).isFile();
  } catch {
    return false;
  }
}

function existsAt(abs) {
  try {
    statSync(abs);
    return true;
  } catch {
    return false;
  }
}

/** Проміжні § діапазону `§0–§2` або `§4.1–§4.3` (по останньому числу). */
function expand(from, to) {
  const out = [];
  const head = from.includes(".") ? from.slice(0, from.lastIndexOf(".") + 1) : "";
  const a = Number(from.slice(head.length));
  const b = Number(to.slice(head.length));
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return out;
  for (let i = a + 1; i < b; i++) out.push(head + i);
  return out;
}

/** § вважається адресованим, якщо є він сам або його розділ (батько/нащадок). */
function covered(ref, set) {
  if (set.has(ref)) return true;
  for (const known of set) {
    if (known.startsWith(ref + ".") || ref.startsWith(known + ".")) return true;
  }
  return false;
}
