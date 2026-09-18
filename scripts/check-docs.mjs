#!/usr/bin/env node
/**
 * Гейт документації — те саме, що `check:css` для класів, але для документів.
 *
 * Документи цього репозиторію — інструкція, за якою працює агент, і вони мусять
 * описувати **поточний стан**: файл, якого вже немає, читається як вказівка до
 * нього. Тому перевіряються чотири речі:
 *
 *   1. Розмір: `.md` > 400 рядків — помилка, > 200 — попередження
 *      (правило кристалевості, `AGENTS.md` §3, тепер і для документів).
 *   2. Мертві відносні посилання: `[текст](./шлях.md)` мусить існувати.
 *   3. Мертвий шлях у тексті: згадка файлу (`packages/…`, `docs/…`, `*.ts`), у
 *      зворотних лапках, мусить існувати в чекауті. Шлях із воркспейса
 *      (`src/api/router.ts`) теж приймається — як хвіст наявного файлу.
 *   4. `AGENTS.md §N` з документа чи коду мусить вести в наявний § `AGENTS.md`:
 *      розділи переписують, а номери в коментарях лишаються — і ведуть у нікуди.
 *
 * Запуск: `npm run check:docs` (той самий крок у CI).
 *
 * @module scripts/check-docs
 */

import { statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { ROOT, read, readLines, walk, WORKSPACES } from "./lib/files.mjs";

const MAX_LINES = 200;
const CRITICAL_LINES = 400;

/** Кореневі документи, які теж мусять бути читабельними. */
const ROOT_DOCS = ["AGENTS.md", "README.md", "CONTRIBUTING.md"];

/**
 * Два файли, які навмисно не діляться, тож попередження на 200 рядків їх не
 * стосується (поріг 400 — стосується):
 *
 *   - `AGENTS.md` — інструкція для агентів: її читають повністю одним файлом;
 *   - `docs/DESIGN_SYSTEM.md` — **один нумерований список правил**, і на номери
 *     посилається код у коментарях. Номер, розділений між файлами, веде в нікуди,
 *     а правило без номера в коді не знайти.
 */
const SIZE_EXEMPT_WARN = new Set(["AGENTS.md", "docs/DESIGN_SYSTEM.md"]);

/** Документ, на § якого посилається код і решта документів. */
const SECTIONS_DOC = "AGENTS.md";

const errors = [];
const warnings = [];

const docs = [...walk("docs", (p) => p.endsWith(".md")), ...ROOT_DOCS.filter(statSafe)];

// ── 1. Розмір документів ──────────────────────────────────────────────────

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
  read(file)
    .split("\n")
    .forEach((line, i) => {
      for (const m of line.matchAll(LINK_RE)) {
        const href = m[1];
        if (/^(https?:|mailto:|#)/.test(href)) continue;
        const target = href.split("#")[0];
        if (!target) continue;
        const abs = normalize(join(ROOT, dirname(file), target));
        if (!statSafeAbs(abs)) {
          errors.push(`${file}:${i + 1} — посилання «${href}» не існує (мертве).`);
        }
      }
    });
}

// ── 3. Мертві шляхи в тексті документів ───────────────────────────────────
// Шлях у зворотних лапках — це обіцянка, що файл є. Шукаємо його як **хвіст**
// наявного шляху: документ може писати `src/api/router.ts` про воркспейс, і
// кореневий шлях йому не потрібен.

const CODE_WORDS = /^(?:packages|docs|scripts|bot-dev|api-dev|web-platform-dev|web-admin-dev)\//;
const CODE_EXT = /\.(?:ts|tsx|mjs|js|css|md|sql|toml|json|html|yml|yaml)$/;
const PATH_TOKEN = /^[\w.-]+(?:\/[\w.-]+)*\/?$/;

const repoFiles = [...walk(".", () => true), ...walk(".github", () => true)];

/**
 * Чи існує шлях. Приймається і **хвіст** наявного шляху: документ пише
 * `src/api/router.ts` про `bot-dev/src/api/router.ts` — шлях від кореня йому не
 * потрібен, а обіцянка «цей файл є» — та сама. Тека теж існує, якщо в ній є файли.
 */
function repoPathExists(token) {
  const path = token.replace(/\/+$/, "");
  // `shared/…` — скорочення для `packages/shared/src/…`, яким користуються документи.
  const tails = path.startsWith("shared/")
    ? [path, `packages/shared/src/${path.slice("shared/".length)}`]
    : [path];
  return tails.some((tail) =>
    repoFiles.some(
      (file) =>
        file === tail ||
        file.endsWith(`/${tail}`) ||
        file.startsWith(`${tail}/`) ||
        file.includes(`/${tail}/`),
    ),
  );
}

for (const file of docs) {
  read(file)
    .split("\n")
    .forEach((line, i) => {
      for (const m of line.matchAll(/`([^`\n]+)`/g)) {
        const token = m[1];
        if (!token.includes("/")) continue;
        if (!PATH_TOKEN.test(token)) continue;
        if (token.startsWith("@") || token.startsWith(".")) continue;
        if (!CODE_WORDS.test(token) && !CODE_EXT.test(token)) continue;
        if (!repoPathExists(token)) {
          errors.push(`${file}:${i + 1} — шлях «${token}» не існує.`);
        }
      }
    });
}

// ── 4. § документа з нумерами — мусить існувати ──────────────────────────

const addressed = new Set();
for (const line of readLines(SECTIONS_DOC)) {
  const m = /^#{1,3}\s+(\d+(?:\.\d+)*)\./.exec(line);
  if (m) addressed.add(m[1]);
}

/** § у тексті: `AGENTS.md §5`, `AGENTS.md §5.2`. */
const SECTION_REF_RE = /AGENTS\.md`?\s*§\s*(\d+(?:\.\d+)*)/g;

const codeFiles = [
  ...WORKSPACES.flatMap((w) => walk(join(w, "src"), (p) => /\.[cm]?[jt]sx?$/.test(p))),
  ...walk("scripts", (p) => p.endsWith(".mjs")),
  ...walk("docs", () => true),
  ...ROOT_DOCS.filter(statSafe),
];

for (const file of codeFiles) {
  readLines(file).forEach((line, i) => {
    for (const m of line.matchAll(SECTION_REF_RE)) {
      if (!covered(m[1], addressed)) {
        errors.push(
          `${file}:${i + 1} — посилання на §${m[1]} веде в нікуди: у ${SECTIONS_DOC} немає ні цього §, ні його розділу.`,
        );
      }
    }
  });
}

// ── Звіт ──────────────────────────────────────────────────────────────────

if (errors.length) {
  console.error("✗ Документація не пройшла перевірку:\n");
  for (const e of errors) console.error(`  ${e}`);
  console.error(
    "\nВиправлення: завеликий документ — поділи на теми й додай рядок у покажчик `docs/README.md`;\n" +
      `мертвий шлях чи § — прибери згадку або онови її на чинну (${SECTIONS_DOC} — джерело правди про §).\n`,
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
      `мертвих посилань 0, мертвих шляхів 0, § без дому 0 (розділів у ${SECTIONS_DOC}: ${addressed.size}).`,
  );
}

// ── дрібні хелпери ────────────────────────────────────────────────────────

function statSafe(rel) {
  return statSafeAbs(join(ROOT, rel));
}

function statSafeAbs(abs) {
  try {
    statSync(abs);
    return true;
  } catch {
    return false;
  }
}

/** § вважається адресованим, якщо є він сам або його розділ (батько/нащадок). */
function covered(ref, set) {
  if (set.has(ref)) return true;
  for (const known of set) {
    if (known.startsWith(ref + ".") || ref.startsWith(known + ".")) return true;
  }
  return false;
}
