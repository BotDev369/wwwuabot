#!/usr/bin/env node
/**
 * Гейт документації — те саме, що `check:css` для класів, але для документів.
 *
 * Документи цього репозиторію — інструкція, за якою працює агент, і вони мусять
 * описувати **поточний стан**: файл, якого вже немає, читається як вказівка до
 * нього. Тому перевіряються п'ять речей:
 *
 *   1. **Бюджет розміру** (рядки **і** вага): межа своя в кожної групи — код
 *      має власний ліміт у `check-quality.mjs`, документ — тут. Файл, який
 *      справді мусить бути довшим, отримує **право** в `BUDGET_RIGHTS` з
 *      причиною; право зсуває м'яку межу (попередження), але не критичну.
 *   2. **Мертві відносні посилання**: `[текст](./шлях.md)` мусить існувати.
 *   3. **Мертвий шлях у тексті**: згадка файлу (`packages/…`, `docs/…`, `*.ts`)
 *      у зворотних лапках мусить існувати в чекауті. Шлях із воркспейса
 *      (`src/api/router.ts`) теж приймається — як хвіст наявного файлу.
 *   4. **Свіжість генерованого** (`docs/API.md`): його збирають із роутера, тож
 *      він не може розійтися з кодом.
 *   5. `AGENTS.md §N` з документа чи коду мусить вести в наявний § `AGENTS.md`:
 *      розділи переписують, а номери в коментарях лишаються — і ведуть у нікуди.
 *
 * Запуск: `npm run check:docs` (той самий крок у CI).
 *
 * @module scripts/check-docs
 */

import { statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { ROOT, read, readLines, walk, WORKSPACES } from "./lib/files.mjs";
import { API_DOC, renderApiDoc } from "./lib/api-routes.mjs";

/**
 * Типовий бюджет документа: червоний прапорець на 200 рядках, критично на 400
 * (правило кристалевості з `AGENTS.md` §3 діє й на документи).
 */
const BUDGET = { warnLines: 200, errorLines: 400, warnKb: 24, errorKb: 64 };

/**
 * **Права на більше.** Документ, який не можна поділити, отримує тут зсунуту
 * м'яку межу **разом із причиною**: без причини право через місяць «оптимізують»
 * у типову межу, а з ним — зникає й користь.
 *
 * Критична межа (400) не зсувається нікому: файл, який її перейшов, не читають,
 * а гортають.
 */
const BUDGET_RIGHTS = {
  "AGENTS.md": {
    warnLines: 300,
    warnKb: 52,
    reason: "єдина інструкція для агентів — читається повністю одним файлом",
  },
  "docs/DESIGN_SYSTEM.md": {
    warnLines: 300,
    warnKb: 48,
    reason: "один нумерований список правил, на номери якого посилається код",
  },
};

/**
 * Генеровані файли: розмір нормує не автор, а код, зате перевіряється свіжість.
 * Список навмисно короткий — генерований документ, якого ніхто не читає, гірший
 * за відсутній.
 */
const GENERATED = { [API_DOC]: renderApiDoc };

const errors = [];
const warnings = [];

const docs = walk(".", (p) => p.endsWith(".md"));

// ── 1. Бюджет розміру ─────────────────────────────────────────────────────

const sizes = docs
  .filter((file) => !GENERATED[file])
  .map((file) => ({ file, lines: readLines(file).length, kb: statSize(file) / 1024 }))
  .sort((a, b) => b.lines - a.lines);

for (const { file, lines, kb } of sizes) {
  const right = BUDGET_RIGHTS[file];
  const warnLines = right?.warnLines ?? BUDGET.warnLines;
  const warnKb = right?.warnKb ?? BUDGET.warnKb;

  if (lines > BUDGET.errorLines) {
    errors.push(
      `${file} — ${lines} рядків (> ${BUDGET.errorLines}). Поділи на теми й додай рядок у покажчик.`,
    );
  } else if (lines > warnLines || kb > warnKb) {
    warnings.push(
      `${file} — ${lines} рядків / ${kb.toFixed(1)} KB ` +
        `(межа ${warnLines} / ${warnKb} KB; ${right ? `право: ${right.reason}` : "права немає"}).`,
    );
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
        if (!statSafeAbs(normalize(join(ROOT, dirname(file), target)))) {
          errors.push(`${file}:${i + 1} — посилання «${href}» не існує (мертве).`);
        }
      }
    });
}

// ── 3. Мертві шляхи в тексті документів ───────────────────────────────────
// Шлях у зворотних лапках — це обіцянка, що файл є. Шукаємо його як **хвіст**
// наявного шляху: документ може писати `src/api/router.ts` про воркспейс, і
// кореневий шлях йому не потрібен.

const TOOL_DIRS = /^(?:packages|docs|scripts|bot-dev|api-dev|web-platform-dev|web-admin-dev)\//;
const CODE_EXT = /\.(?:ts|tsx|mjs|js|css|md|sql|toml|json|html|yml|yaml)$/;
const PATH_TOKEN = /^[\w.-]+(?:\/[\w.-]+)*\/?$/;

const repoFiles = [...walk(".", () => true), ...walk(".github", () => true)];

/** Чи існує шлях — як файл, як тека з файлами або як хвіст наявного шляху. */
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
        if (!TOOL_DIRS.test(token) && !CODE_EXT.test(token)) continue;
        if (!repoPathExists(token)) errors.push(`${file}:${i + 1} — шлях «${token}» не існує.`);
      }
    });
}

// ── 4. Свіжість генерованих документів ────────────────────────────────────

for (const [file, render] of Object.entries(GENERATED)) {
  if (!statSafeAbs(join(ROOT, file))) {
    errors.push(`${file} — немає в чекауті. Згенеруй: npm run doc:api.`);
  } else if (read(file) !== render()) {
    errors.push(`${file} — розійшовся з кодом. Перегенеруй: npm run doc:api.`);
  }
}

// ── 5. § документа з нумерами — мусить існувати ──────────────────────────

const SECTIONS_DOC = "AGENTS.md";
const addressed = new Set();
for (const line of readLines(SECTIONS_DOC)) {
  const m = /^#{1,3}\s+(\d+(?:\.\d+)*)\./.exec(line);
  if (m) addressed.add(m[1]);
}

const SECTION_REF_RE = /AGENTS\.md`?\s*§\s*(\d+(?:\.\d+)*)/g;
const codeFiles = [
  ...WORKSPACES.flatMap((w) => walk(join(w, "src"), (p) => /\.[cm]?[jt]sx?$/.test(p))),
  ...walk("scripts", (p) => p.endsWith(".mjs")),
  ...docs,
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

const weight = docs.reduce((sum, file) => sum + statSize(file), 0);

if (errors.length) {
  console.error("✗ Документація не пройшла перевірку:\n");
  for (const e of errors) console.error(`  ${e}`);
  console.error(
    "\nВиправлення: завеликий документ — поділи на теми (або, якщо поділити справді ніяк,\n" +
      "додай йому право в BUDGET_RIGHTS із причиною); генерований — `npm run doc:api`;\n" +
      `мертвий шлях чи § — прибери згадку або онови на чинну (${SECTIONS_DOC} — джерело правди).\n`,
  );
  process.exitCode = 1;
} else {
  if (warnings.length) {
    console.log("⚠ Попередження (не блокує):");
    for (const w of warnings) console.log(`  ${w}`);
    console.log("");
  }
  console.log(
    `✓ Документація: файлів ${docs.length}, найбільший ${sizes[0].lines} рядків ` +
      `(${sizes[0].file}); разом ${(weight / 1024).toFixed(1)} KB; мертвих посилань 0, ` +
      `мертвих шляхів 0, застарілих генерованих 0, § без дому 0.`,
  );
}

// ── дрібні хелпери ────────────────────────────────────────────────────────

function statSize(rel) {
  try {
    return statSync(join(ROOT, rel)).size;
  } catch {
    return 0;
  }
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
