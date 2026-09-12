#!/usr/bin/env node
/**
 * «Планка в CI» — перевірки, які тримають правила `AGENTS.md`, а не добрі наміри.
 *
 * Навіщо: гейти перевіряли, що код **компілюється**, а не що він потрібен. Саме
 * тому 44 класи без CSS, 15% мертвого коду й файли по 777 рядків прожили місяці.
 * Кожна перевірка нижче — це правило, яке доти існувало лише в тексті.
 *
 * Що перевіряється:
 *
 *   1. Кристалева ясність (`AGENTS.md` §3): файл > 400 рядків — помилка;
 *      > 200 — попередження. Дані (таблиці констант) не рахуються взагалі.
 *   2. Нативні `alert` / `confirm` / `prompt` (`AGENTS.md` §4) — заборонені:
 *      в iOS-WebView Telegram вони не працюють (`prompt` → `null`).
 *   3. Голий `100vh` (`AGENTS.md` §3): висота мусить мати `100dvh`-фолбек,
 *      інакше адресний рядок на телефоні «стрибає».
 *   4. Емодзі в UI (`AGENTS.md` §4) — тільки `<Icon />`. Піктограми, не
 *      символи: `↑ ↓ ✕ ★ ✓` лишаються дозволеними, бо це не емодзі.
 *
 * Запуск: `npm run check:quality` (той самий гейт стоїть у CI).
 * Відомий борг живе в `scripts/quality-baseline.mjs` і тільки зменшується.
 */

import { join } from "node:path";
import {
  allSourceFiles,
  exists,
  isCss,
  isSource,
  read,
  readLines,
  SHELLS,
  stripComments,
  walk,
} from "./lib/files.mjs";
import { QUALITY_BASELINE } from "./quality-baseline.mjs";

/** «Червоний прапорець» — попередження. */
const MAX_LINES = 200;
/** «Критично» — помилка. */
const CRITICAL_LINES = 400;

const errors = [];
const warnings = [];

/** Коментарі — не порушення: `100vh` у поясненні не рахуємо, але рядки зберігаємо. */
function blankComments(text) {
  const blank = (m) => m.replace(/[^\n]/g, " ");
  return text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/^[ \t]*\/\/.*$/gm, blank);
}

// ── 1. Кристалева ясність ──────────────────────────────────────────────────

const { oversizedFiles, dataOnlyFiles, emojiInUi } = QUALITY_BASELINE;
const data = new Set(dataOnlyFiles);
const debt = new Set(Object.keys(oversizedFiles));

const sizes = allSourceFiles()
  .filter((f) => !data.has(f))
  .map((f) => ({ file: f, lines: readLines(f).length }))
  .sort((a, b) => b.lines - a.lines);

const newCritical = sizes.filter((s) => s.lines > CRITICAL_LINES && !debt.has(s.file));
const overMax = sizes.filter((s) => s.lines > MAX_LINES);

for (const s of newCritical) {
  errors.push(`${s.file} — ${s.lines} рядків (> ${CRITICAL_LINES}). Розбий на хук/підкомпоненти.`);
}

// Леджер мусить лишатись чесним: файл або є, або його вже поділили.
for (const file of [...debt, ...data]) {
  if (!exists(file)) errors.push(`scripts/quality-baseline.mjs: ${file} — немає в чекауті.`);
  else if (debt.has(file) && readLines(file).length <= CRITICAL_LINES) {
    errors.push(
      `scripts/quality-baseline.mjs: ${file} уже ≤ ${CRITICAL_LINES} рядків — прибери його з леджера.`,
    );
  }
}

if (overMax.length) {
  warnings.push(
    `Файлів > ${MAX_LINES} рядків: ${overMax.length}. Найбільші:\n` +
      overMax
        .slice(0, 10)
        .map((s) => `  ${String(s.lines).padStart(4)}  ${s.file}`)
        .join("\n"),
  );
}

// ── 2. Нативні діалоги ─────────────────────────────────────────────────────

/**
 * `packages/ui/src/dialog/` виключено: там **оголошено** методи нашого діалогу
 * (`alert(message: string)`) — це інтерфейс, а не виклик нативного вікна.
 */
const dialogScanned = [
  ...walk("packages/shared/src", isSource),
  ...walk("packages/ui/src", isSource),
  ...SHELLS.flatMap((s) => walk(join(s, "src"), isSource)),
].filter((f) => !f.startsWith(join("packages/ui", "src", "dialog")));

const NATIVE_DIALOG_RE = /(?<![\w$.])(?:window\s*\.\s*)?(alert|confirm|prompt)\s*\(/g;

for (const file of dialogScanned) {
  const text = stripComments(read(file))
    // `dialog.alert(…)` — це наш діалог, а не нативне вікно.
    .replace(/\bdialog\s*\.\s*(alert|confirm|prompt)\s*\(/g, "");
  for (const m of text.matchAll(NATIVE_DIALOG_RE)) {
    const line = text.slice(0, m.index).split("\n").length;
    errors.push(`${file}:${line} — нативний «${m[1]}» заборонено, використовуй useDialog() (§4).`);
  }
}

// ── 3. Голий `100vh` ───────────────────────────────────────────────────────

const vhScanned = [
  ...walk("packages/shared/src/styles", isCss),
  ...SHELLS.flatMap((s) => walk(join(s, "src"), (p) => isCss(p) || isSource(p))),
];

for (const file of vhScanned) {
  const lines = blankComments(read(file)).split("\n");
  lines.forEach((line, i) => {
    if (!/\b100vh\b/.test(line)) return;
    // Фолбек — це `100dvh` у тому самому блоці (одразу після оголошення).
    const after = lines.slice(i, i + 3).join("\n");
    if (/\b100dvh\b/.test(after)) return;
    errors.push(`${file}:${i + 1} — «100vh» без «100dvh»-фолбеку (§3, мобільний).`);
  });
}

// ── 4. Емодзі в UI ─────────────────────────────────────────────────────────

/**
 * Тільки піктограми (емодзі) — символи `↑ ↓ ✕ ★ ✓ ♑` не заборонені: це не
 * емодзі, а типографіка. Різниця навмисна, інакше правило ловило б зодіак.
 */
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{FE0F}\u{20E3}]/u;
const emojiAllowed = new Set(emojiInUi);

const emojiScanned = [
  ...walk("packages/ui/src", isSource),
  ...walk("packages/shared/src", isSource),
  ...walk("packages/shared/src/styles", isCss),
  ...SHELLS.flatMap((s) => walk(join(s, "src"), (p) => isCss(p) || isSource(p))),
];

for (const file of emojiScanned) {
  readLines(file).forEach((line, i) => {
    const m = line.match(EMOJI_RE);
    if (!m || emojiAllowed.has(m[0])) return;
    errors.push(`${file}:${i + 1} — емодзі «${m[0]}» в UI заборонено, використовуй <Icon /> (§4).`);
  });
}

// ── Звіт ───────────────────────────────────────────────────────────────────

if (errors.length) {
  console.error("✗ Планка якості не пройдена:\n");
  for (const e of errors) console.error(`  ${e}`);
  console.error(
    "\nВиправлення: розбий файл, заміни виклик на useDialog() або додай dvh-фолбек.\n" +
      "Якщо це вже описаний в документації борг — він мусить бути в scripts/quality-baseline.mjs.\n",
  );
  process.exitCode = 1;
} else {
  if (warnings.length) {
    console.log("⚠ Попередження (не блокує):");
    for (const w of warnings) console.log(`  ${w}`);
    console.log("");
  }
  console.log(
    `✓ Планка: файлів ${sizes.length}, найбільший ${sizes[0].lines} рядків; ` +
      `нативних діалогів 0, голих 100vh 0, емодзі в UI 0.`,
  );
  if (debt.size || data.size) {
    console.log(
      `  У відомому боргу (scripts/quality-baseline.mjs): ${debt.size} файлів > ${CRITICAL_LINES} ` +
        `(план §3.2 і §3.5) + ${data.size} файлів-даних, ліміт на них не діє.`,
    );
  }
}
