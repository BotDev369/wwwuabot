#!/usr/bin/env node
/**
 * Гейт документації — те саме, що `check:css` для класів, але для документів.
 *
 * Документи цього репозиторію — інструкція, за якою працює агент, і вони мусять
 * описувати **поточний стан**: файл, якого вже немає, читається як вказівка до
 * нього. Тому перевіряються дев'ять речей:
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
 *   6. **Згадка документа з коду, конфігу чи SQL** (`docs/…md` у коментарі, `wrangler.toml`
 *      чи міграції) мусить існувати. Посилання всередині `.md` гейт бачить, а те, що
 *      написав код, — ні, і саме там документ зникає мовчки.
 *   7. **Секційний бюджет `AGENTS.md`**: секція, що переросла у власну тему, друкується
 *      попередженням (процедура винесення — `docs/DOC_GROWTH.md`).
 *   8. **Межа редагування (~35 KB).** Інструменти читають лише перші ~35 KB файлу: довший
 *      документ **читається**, але правка в хвості «не знаходить» текст — і не скаржиться.
 *      Тому файл понад 34 KiB (34 816 байтів) — помилка, а не попередження; виняток живе
 *      в `EDIT_LIMIT_DEBT` із причиною й зникає, щойно файл вписується в межу.
 *   9. **Покажчик не забув документа**: кожен `.md` із `docs/` мусить мати рядок у
 *      `docs/README.md`. Перелік тем не друкує жоден гейт (сутність документа — людський
 *      текст), тож перевіряється те, що перевірити можна: нікого не забули.
 *
 * Запуск: `npm run check:docs` (той самий крок у CI).
 *
 * @module scripts/check-docs
 */

import { statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { ROOT, read, readLines, repoPathExists, walk, WORKSPACES } from "./lib/files.mjs";
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
    warnLines: 260,
    warnKb: 34,
    reason:
      "єдина інструкція для агентів — читається повністю одним файлом, тому не має власного поділу, але тримається за межею редагування",
  },
};

/* `docs/DESIGN_SYSTEM.md` тут був із причиною «один нумерований список правил»,
   поки в ньому лежали всі правила. Поверхні й колекції поїхали в свої
   документи, файл уліз у типову межу — і право зникло: виняток, якого не
   потребують, це той самий шум, що й зайве пояснення в правилі. Номери правил
   при цьому лишились незмінними — на них досі посилається код. */

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

// ── 1b. Межа редагування (не смак, а стеля інструмента) ────────────────────
// Vly/Daytona-редактор бере лише перші ~35 KB файлу: довший документ **читається**,
// але правка в хвості «не знаходить» текст — і не скаржиться. Тому стеля тут нижча
// за реальну межу: файл, який її переріс, ділиться на теми, а не росте.

const EDIT_LIMIT = 34 * 1024;

/**
 * Борг за межею редагування: файл уже переріс, і поділ попереду. Запис мусить бути
 * **живий** — щойно файл вписується в межу, гейт вимагає прибрати рядок (той самий
 * принцип, що в `scripts/quality-baseline.mjs`).
 */
const EDIT_LIMIT_DEBT = {};

/* Порожньо — і це стан, а не намір: обидва файли, які тут стояли (`docs/SHOPS.md`
   і `docs/DESIGN_SYSTEM.md`), поділено на теми — товар поїхав у `docs/PRODUCTS.md`,
   знаки — у `docs/ICONS.md`, каркас оболонки — у `docs/PLATFORM.md`. Леджер лишається
   живим: щойно якийсь документ переросте межу, він сюди повертається з причиною. */

for (const { file } of sizes) {
  const bytes = statSize(file);
  const debt = EDIT_LIMIT_DEBT[file];
  if (bytes > EDIT_LIMIT) {
    if (!debt) {
      errors.push(
        `${file} — ${bytes} байтів (> ${EDIT_LIMIT}): такий файл уже не редагується інструментом. Поділи на теми.`,
      );
    }
  } else if (debt) {
    errors.push(
      `${file} — ${bytes} байтів: вписався в межу редагування, прибери з EDIT_LIMIT_DEBT.`,
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

// ── 6. Згадка документа з коду, конфігу й SQL ─────────────────────────────
// Документ називають не лише інші документи: його згадують коментарі коду,
// `wrangler.toml` і міграції. Посилання всередині `.md` гейт уже бачить, а ці — ні,
// тож видалений документ лишався в них вказівкою в нікуди (саме так видалений план
// консолідації жив у `api-dev/wrangler.toml`). Тести не рахуються: шлях у фікстурі —
// не обіцянка, що файл є.

const DOC_MENTION_RE = /docs\/[A-Za-z0-9_./-]+\.md/g;
const DOC_REF_LANG = /\.(?:[cm]?[jt]sx?|css|toml|sql)$/;
const isTestFile = (p) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(p);

for (const file of walk(".", (p) => DOC_REF_LANG.test(p) && !isTestFile(p))) {
  readLines(file).forEach((line, i) => {
    for (const m of line.matchAll(DOC_MENTION_RE)) {
      if (!statSafeAbs(join(ROOT, m[0]))) {
        errors.push(`${file}:${i + 1} — згадка «${m[0]}» веде в нікуди: такого документа немає.`);
      }
    }
  });
}

// ── 1c. Секційний бюджет AGENTS.md ────────────────────────────────────────
// Бюджет файла (§1) ловить момент, коли документ уже не редагується. Цей — раніше
// й корисніше: він каже, коли **секція правил** перестала правилом бути й стала
// документом. Сигнал, за яким тему виносять заздалегідь, а не коли вже нічого.
// Поріг м'який: рішення приймає людина, гейт лише показує, де вона потрібна.

const SECTION_BUDGET = { warnLines: 40 };

{
  const lines = readLines(SECTIONS_DOC);
  let title = null;
  let count = 0;
  const close = () => {
    if (title && count > SECTION_BUDGET.warnLines) {
      warnings.push(
        `${SECTIONS_DOC} ${title} — ${count} рядків (> ${SECTION_BUDGET.warnLines}): ` +
          `секція перестала бути правилом і стала документом. Алгоритм винесення — docs/DOC_GROWTH.md.`,
      );
    }
  };
  for (const line of lines) {
    if (line.startsWith("## ")) {
      close();
      title = line.replace(/^##\s*/, "").replace(/\s*$/, "");
      count = 0;
    } else if (title) {
      count++;
    }
  }
  close();
}

// ── 8. Покажчик не забув документа ────────────────────────────────────────
// `docs/README.md` — реєстр документів, і він написаний руками: сутність документа —
// людський текст, тож жоден гейт його не надрукує. Перевіряється тому не сам перелік, а
// те, що в ньому **нікого не забули**: документ без рядка в покажчику читають як
// приватний — про нього просто не дізнаються.

const INDEX = "docs/README.md";
const indexDir = dirname(INDEX);
const listedInIndex = new Set(
  [...read(INDEX).matchAll(/\]\(\.\/([A-Za-z0-9_.-]+\.md)\)/g)].map((m) => m[1]),
);

for (const file of docs) {
  if (dirname(file) !== indexDir || file === INDEX) continue;
  if (!listedInIndex.has(file.slice(indexDir.length + 1))) {
    errors.push(`${file} — немає рядка в ${INDEX}: документ без покажчика не знайдуть.`);
  }
}

// ── Звіт ──────────────────────────────────────────────────────────────────

const weight = docs.reduce((sum, file) => sum + statSize(file), 0);

if (errors.length) {
  console.error("✗ Документація не пройшла перевірку:\n");
  for (const e of errors) console.error(`  ${e}`);
  console.error(
    "\nВиправлення: завеликий документ — поділи на теми (або, якщо поділити справді ніяк,\n" +
      "додай йому право в BUDGET_RIGHTS із причиною); файл за межею редагування — поділи на теми\n" +
      "(поділ попереду — познач у EDIT_LIMIT_DEBT із причиною); генерований — `npm run doc:api`;\n" +
      `мертвий шлях, §, згадка з коду чи документ без рядка в покажчику — прибери, онови або\n` +
      `додай (${SECTIONS_DOC} і docs/README.md — джерела правди).\n`,
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
      `мертвих шляхів 0, мертвих згадок з коду 0, застарілих генерованих 0, § без дому 0; ` +
      `за межею редагування — ${Object.keys(EDIT_LIMIT_DEBT).length} у боргу.`,
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
