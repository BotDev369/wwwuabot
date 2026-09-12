#!/usr/bin/env node
/**
 * Перевірка «клас у розмітці ↔ правило в CSS».
 *
 * Навіщо: `class="wb-mt-3"` без `.wb-mt-3` не ламає ні збірку, ні тести —
 * він просто нічого не робить, і помітити це можна було лише очима. Саме так
 * у проєкті прожили 44 класи `wb-block-*` без жодного правила (кнопки блока
 * були невидимі), мертвий `.sidebar-theme-btn` і `.site-preview`.
 *
 * Що перевіряється:
 *
 *   1. shared-unstyled (помилка) — клас, який рендерить СПІЛЬНИЙ код
 *      (`packages/ui`, `packages/shared`), мусить мати правило в
 *      `packages/shared/src/styles/`. Якщо його стилізує лише одна оболонка,
 *      друга виглядає інакше — це і є «розсинхрон між оболонками».
 *
 *   2. unresolved (помилка) — клас у розмітці оболонки мусить мати правило
 *      або в shared, або у ВЛАСНОМУ CSS цієї оболонки. Клас, узятий із CSS
 *      сусідньої оболонки, у ній не працює.
 *
 *   3. dead (попередження) — правила, яких немає в `src/` навіть підрядком.
 *      Це НИЖНЯ оцінка: імена, склеєні рядками, статично не видно.
 *
 * Запуск: `npm run check:css` (той самий гейт стоїть у CI).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isCss, isSource, ROOT, walk } from "./lib/files.mjs";
import { BASELINE } from "./css-baseline.mjs";

/** Групи файлів: де визначено CSS і де вжито класи. */
const STYLE_GLOBS = ["packages/shared/src/styles", "web-platform-dev/src", "web-admin-dev/src"];

/** Спільний код, який рендериться в ОБИДВІ оболонки. */
const SHARED_CODE = ["packages/ui/src", "packages/shared/src"];
const SHELL_CODE = {
  "web-platform-dev": ["web-platform-dev/src"],
  "web-admin-dev": ["web-admin-dev/src"],
};

const SHARED_STYLES = "packages/shared/src/styles";

/**
 * Класи, які генерує Tailwind, а не дизайн-система. Список порожній, бо
 * оболонки будуються з кирпичиків `.wb-*`, а не з утиліт: якщо тут щось
 * з'явиться, перевірка попросить додати клас у CSS — і це правильна розмова.
 */
const TAILWIND_ALLOWLIST = new Set();

// ── Збір файлів ────────────────────────────────────────────────────────────
// `walk` / `isCss` / `isSource` / `ROOT` переїхали в `scripts/lib/files.mjs`:
// ними користується і `check-quality.mjs`, а дві копії обходу дерева розійшлися б.

// ── Витяг класів із CSS ────────────────────────────────────────────────────

const CSS_CLASS_RE = /\.(-?[A-Za-z_][A-Za-z0-9_-]*)/g;

function stripComments(css) {
  return (
    css
      .replace(/\/\*[\s\S]*?\*\//g, "")
      // `@import url("https://fonts.googleapis.com/…")` — це не селектор.
      // Без цього `.googleapis` з адреси шрифту трапляв у звіт як клас.
      .replace(/@(?:import|charset|namespace)[^;]*;/g, "")
  );
}

/**
 * Класи зі селекторної частини правил.
 *
 * Ідемо з урахуванням вкладеності: селектор — це текст від попередньої
 * дужки до `{`, і так на будь-якій глибині. Без цього правила всередині
 * `@media` не знаходились зовсім (бо «селектором» ставав сам `@media`).
 */
function cssClasses(css) {
  const out = new Set();
  const text = stripComments(css);
  let boundary = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch !== "{" && ch !== "}") continue;
    if (ch === "{") {
      const selector = text.slice(boundary, i);
      for (const m of selector.matchAll(CSS_CLASS_RE)) out.add(m[1]);
    }
    boundary = i + 1;
  }
  return out;
}

// ── Витяг класів із розмітки ───────────────────────────────────────────────

/** Знайти кінець виразу `{...}` від позиції відкритої дужки. */
function matchBrace(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  return text.length - 1;
}

/**
 * Усі рядкові літерали у виразі.
 *
 * Літерал, перед яким стоїть оператор порівняння (`tone === "danger"`),
 * класом не є — інакше значення потрапляють у звіт як «клас без правила».
 */
function literalsIn(expr) {
  const out = [];
  const re = /(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g;
  for (const m of expr.matchAll(re)) {
    const before = expr.slice(0, m.index).trimEnd();
    out.push({ body: m[2], isComparison: /(===|!==|==|!=)$/.test(before) });
  }
  return out;
}

/**
 * Токени класів із рядкового літерала.
 *
 * `${…}` не викидаємо: імена класів склеюються динамічно
 * (`` `tg-heading--h${level}` ``, `` `wb-nav-item${active}` ``), і тоді
 * фрагмент є ПРЕФІКСОМ класу. Такі фрагменти збираються окремо —
 * перевірка зіставляє їх за префіксом, а не за рівністю.
 *
 * `${…}` усередині теж може містити літерали (`${x ? "wb-a" : ""}`) — їх
 * обходимо рекурсивно.
 */
function tokensFrom(body) {
  const tokens = [];
  const dynamic = [];
  let current = "";
  let suffixIsDynamic = false;

  const flush = (cutLast) => {
    const parts = current.split(/\s+/).filter(Boolean);
    current = "";
    if (cutLast && parts.length) dynamic.push(parts.pop());
    tokens.push(...parts);
    suffixIsDynamic = false;
  };

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];

    if (ch === "$" && body[i + 1] === "{") {
      // Фрагмент перед `${` приклеєний до виразу — він може бути префіксом
      flush(/[^\s]/.test(current.slice(-1) || " ") || !current);
      let depth = 1;
      const start = i + 2;
      let j = i + 1;
      while (j < body.length && depth > 0) {
        j++;
        if (body[j] === "{") depth++;
        else if (body[j] === "}") depth--;
      }
      for (const lit of literalsIn(body.slice(start, j))) {
        if (lit.isComparison) continue;
        const nested = tokensFrom(lit.body);
        tokens.push(...nested.tokens);
        dynamic.push(...nested.dynamic);
      }
      i = j;
      // Фрагмент після `}` без пробілу — теж префікс/суфікс динаміки
      suffixIsDynamic = !/\s/.test(body[i + 1] ?? " ");
      continue;
    }

    if (ch === "\n" || ch === "\t") current += " ";
    else current += ch;
  }

  flush(suffixIsDynamic);
  return { tokens, dynamic };
}

/**
 * Класи, які рендерить розмітка файлу.
 *
 * Повертає дві множини: точні tokens і `dynamic` — фрагменти, склеєні з
 * виразом. Другі перевіряються за префіксом.
 */
function markupClasses(source, isDefined) {
  const tokens = new Set();
  const dynamic = new Set();

  const add = (list, bucket) => {
    for (const token of list) {
      if (!token || token.endsWith("-")) continue;
      // Токен без дефіса — це або утиліта Tailwind, або взагалі не клас
      // (у виразах трапляються рядки значень: `tone === "danger"`).
      // Беремо його тільки якщо правило справді існує.
      if (!token.includes("-") && !isDefined(token)) continue;
      bucket.add(token);
    }
  };

  for (const m of source.matchAll(/className\s*=/g)) {
    let i = m.index + m[0].length;
    while (i < source.length && /\s/.test(source[i])) i++;
    if (source[i] === '"' || source[i] === "'" || source[i] === "`") {
      const quote = source[i];
      const end = source.indexOf(quote, i + 1);
      if (end === -1) continue;
      const parsed = tokensFrom(source.slice(i + 1, end));
      add(parsed.tokens, tokens);
      add(parsed.dynamic, dynamic);
    } else if (source[i] === "{") {
      const end = matchBrace(source, i);
      for (const lit of literalsIn(source.slice(i + 1, end))) {
        if (lit.isComparison) continue;
        const parsed = tokensFrom(lit.body);
        add(parsed.tokens, tokens);
        add(parsed.dynamic, dynamic);
      }
    }
  }
  return { tokens, dynamic };
}

// ── Основна логіка ─────────────────────────────────────────────────────────

const styleFiles = STYLE_GLOBS.flatMap((dir) => walk(dir, isCss));
const cssByFile = new Map();
const allCssClasses = new Set();

for (const file of styleFiles) {
  const classes = cssClasses(readFileSync(join(ROOT, file), "utf8"));
  cssByFile.set(file, classes);
  for (const c of classes) allCssClasses.add(c);
}

const classesIn = (prefixes) => {
  const out = new Set();
  for (const [file, classes] of cssByFile) {
    if (prefixes.some((p) => file.startsWith(p))) for (const c of classes) out.add(c);
  }
  return out;
};

const sharedCss = classesIn([SHARED_STYLES]);
const cssByShell = {
  "web-platform-dev": classesIn(["web-platform-dev/src"]),
  "web-admin-dev": classesIn(["web-admin-dev/src"]),
};

const isDefined = (c) => allCssClasses.has(c);

/**
 * Чи має клас правило.
 *
 * Для динамічних фрагментів (`tg-heading--h${level}`) достатньо, щоб існував
 * хоч один клас із таким початком: `tg-heading--h1`…`h6` у CSS є, отже
 * розмітка коректна.
 */
function isResolved(token, dynamic, defined) {
  if (defined.has(token)) return true;
  if (!dynamic) return false;
  for (const c of defined) if (c.startsWith(token)) return true;
  return false;
}

const collect = (dirs) => {
  const tokens = new Set();
  const dynamic = new Set();
  for (const dir of dirs) {
    for (const file of walk(dir, isSource)) {
      const parsed = markupClasses(readFileSync(join(ROOT, file), "utf8"), isDefined);
      for (const c of parsed.tokens) tokens.add(c);
      for (const c of parsed.dynamic) dynamic.add(c);
    }
  }
  // Динамічні фрагменти, які вже покриті точним іменем, окремо не потрібні
  for (const c of dynamic) if (tokens.has(c)) dynamic.delete(c);
  return { tokens, dynamic };
};

const sharedMarkup = collect(SHARED_CODE);

const shellMarkup = {};
for (const [shell, dirs] of Object.entries(SHELL_CODE)) shellMarkup[shell] = collect(dirs);

const errors = [];
const warnings = [];
const tolerated = [];

const inBaseline = (patterns, token) => patterns.some((re) => re.test(token));

// 1. Спільний код мусить бути стилізований у спільному CSS
const sharedUnstyled = [];
for (const c of [...sharedMarkup.tokens, ...sharedMarkup.dynamic].sort()) {
  if (isResolved(c, sharedMarkup.dynamic.has(c), sharedCss)) continue;
  if (TAILWIND_ALLOWLIST.has(c)) continue;
  if (inBaseline(BASELINE.sharedUnstyledPatterns ?? [], c)) tolerated.push(c);
  else sharedUnstyled.push(c);
}

// 2. Клас оболонки мусить мати правило в shared або у власному CSS
const unresolved = {};
for (const [shell, used] of Object.entries(shellMarkup)) {
  const patterns = BASELINE.unresolvedPatterns?.[shell] ?? [];
  unresolved[shell] = [];
  for (const c of [...used.tokens, ...used.dynamic].sort()) {
    const defined = new Set([...sharedCss, ...cssByShell[shell]]);
    if (isResolved(c, used.dynamic.has(c), defined)) continue;
    if (TAILWIND_ALLOWLIST.has(c)) continue;
    if (inBaseline(patterns, c)) tolerated.push(c);
    else unresolved[shell].push(c);
  }
}

// 3. Мертвий CSS (нижня оцінка)
const allSources = [
  ...walk("packages/ui/src", isSource),
  ...walk("packages/shared/src", isSource),
  ...walk("web-platform-dev/src", isSource),
  ...walk("web-admin-dev/src", isSource),
]
  .map((f) => readFileSync(join(ROOT, f), "utf8"))
  .join("\n");

const deadCss = [...allCssClasses].filter((c) => !allSources.includes(c)).sort();

if (sharedUnstyled.length) {
  errors.push(
    `Спільний код рендерить класи без правила в ${SHARED_STYLES}/ (${sharedUnstyled.length}):\n` +
      sharedUnstyled.map((c) => `  .${c}`).join("\n"),
  );
}

for (const [shell, list] of Object.entries(unresolved)) {
  if (!list.length) continue;
  errors.push(
    `Класи в ${shell}/src не мають правила ні в shared, ні у власному CSS (${list.length}):\n` +
      list.map((c) => `  .${c}`).join("\n"),
  );
}

if (deadCss.length) {
  warnings.push(
    `Мертвий CSS — клас не згадується в src навіть підрядком (${deadCss.length}):\n` +
      deadCss.map((c) => `  .${c}`).join("\n"),
  );
}

const report = (title, list) => {
  console.log(`\n${title}`);
  console.log(list);
};

if (errors.length) {
  console.error("✗ Перевірка CSS-класів не пройдена:\n");
  for (const e of errors) console.error(`${e}\n`);
  console.error(
    "Виправлення: або додати правило (у shared, якщо клас рендерить спільний код),\n" +
      "або прибрати клас із розмітки.\n",
  );
  process.exitCode = 1;
} else if (warnings.length) {
  report("⚠ Попередження (не блокує):", warnings.join("\n"));
}

if (!errors.length) {
  const shellTotal = Object.values(shellMarkup).reduce(
    (n, s) => n + s.tokens.size + s.dynamic.size,
    0,
  );
  console.log(
    `✓ CSS-класи: ${sharedMarkup.tokens.size} у спільному коді, ${shellTotal} у оболонках — ` +
      `усі мають правила (${allCssClasses.size} класів у ${styleFiles.length} CSS-файлах).`,
  );
  if (tolerated.length) {
    console.log(
      `\n  У відомому боргу (scripts/css-baseline.mjs): ${tolerated.length} класів — ` +
        `див. план §3 пункт 3.`,
    );
  }
}
