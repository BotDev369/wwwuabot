#!/usr/bin/env node
/**
 * Інвентар екранів платформи: читає роутер і каже про кожен екран, **звідки
 * береться його вміст** — зі сценарію (`page_data`), зі своєї таблиці чи з
 * коду — і скільки тексту в цьому екрані написано руками.
 *
 * Перелік екранів руками не тримають: він розходиться з роутером на першому ж
 * перейменуванні. Джерело — `web-platform-dev/src/app/router.tsx`, а клас
 * виводиться з того, що екран справді робить (рендерер сторінки, запит до
 * API або ані того, ані того).
 *
 * Правила класів — `docs/PAGE_AUDIT.md`. Запуск: `npm run audit:pages`.
 *
 * @module scripts/page-inventory
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { ROOT } from "./lib/files.mjs";

const APP = "web-platform-dev";
const SRC = join(APP, "src");
const ROUTER = join(SRC, "app", "router.tsx");

/** Файли, де оголошені адреси: роутер складає шлях із цих констант. */
const ROUTE_SOURCES = [
  join(SRC, "app", "routes.ts"),
  join(SRC, "pages", "research", "route.ts"),
  "packages/shared/src/app/routes.ts",
];

const read = (file) => readFileSync(join(ROOT, file), "utf8");

/** Блокові й рядкові коментарі — геть: у них трапляються і `path:`, і `</…>`. */
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** `export const X = "…"` і `` export const X = `/…${Y}` `` — у порядку появи. */
function routeConstants() {
  const map = new Map();
  const files = [...ROUTE_SOURCES];
  // Реекспорт — теж джерело адреси (`export { MESSAGES_PATH } from "@/…"`):
  // без нього шлях лишається іменем константи, і інвентар показує не адресу.
  for (const file of files) {
    if (!existsSync(join(ROOT, file))) continue;
    for (const [, names, spec] of stripComments(read(file)).matchAll(
      /export\s*\{([^}]*)\}\s*from\s*"([^"]+)"/g,
    )) {
      const target = moduleFile(spec, file);
      if (target) files.push(target);
      void names;
    }
  }
  for (const file of files) {
    if (!existsSync(join(ROOT, file))) continue;
    for (const [, name, value] of stripComments(read(file)).matchAll(
      /export const (\w+) = (`[^`]*`|"[^"]*")/g,
    )) {
      map.set(name, value.slice(1, -1));
    }
  }
  return map;
}

/** Значення виразу адреси: літерал, константа або шаблон із `${Константа}`. */
function resolvePath(expr, constants) {
  const raw = expr.trim();
  if (raw.startsWith("`") || raw.startsWith('"')) {
    const body = raw.slice(1, -1);
    return body.replace(/\$\{(\w+)\}/g, (all, name) => constants.get(name) ?? all);
  }
  return constants.get(raw) ?? raw;
}

/** Імпорти роутера: ім'я компонента → файл екрана. */
function routerImports(text) {
  const map = new Map();
  for (const [, names, spec] of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*"([^"]+)"/g)) {
    for (const name of names.split(",").map((part) =>
      part
        .trim()
        .split(/\s+as\s+/)
        .pop(),
    )) {
      if (name) map.set(name, spec);
    }
  }
  return map;
}

const CANDIDATES = ["", ".tsx", ".ts", "/index.tsx", "/index.ts"];

/** Специфікатор імпорту → файл на диску; `null` — це пакет, а не екран. */
function moduleFile(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = join(SRC, spec.slice(2));
  else if (spec.startsWith("@wwwuabot/shared/"))
    base = join("packages/shared/src", spec.slice("@wwwuabot/shared/".length));
  else if (spec.startsWith("./") || spec.startsWith("../")) {
    // `dirname` від відносного шляху дає відносний: `resolve` зробив би
    // абсолютний, і `join(ROOT, …)` більше не знайшов би файл.
    base = join(dirname(fromFile), spec);
  } else return null;
  for (const suffix of CANDIDATES) {
    const file = base + suffix;
    if (existsSync(join(ROOT, file)) && statSync(join(ROOT, file)).isFile()) return file;
  }
  return null;
}

/**
 * Файли екрана: він сам і його локальні залежності на два кроки вглиб.
 *
 * Глибина — не «про всяк випадок»: вміст екрана живе в його підкомпонентах
 * (`trackers/`, `user-pages/`), і пошук лише у файлі-вході назвав би екран
 * порожнім.
 */
function screenFiles(entryFile) {
  const seen = new Set([entryFile]);
  for (const [, spec] of read(entryFile).matchAll(/from\s*"([^"]+)"/g)) {
    const next = moduleFile(spec, entryFile);
    // Тільки екрани: `app/routes.ts` — не частина екрана, а спільні адреси, і
    // без цього винятку кожен екран рахував би його рядки собі.
    if (next && next.startsWith(join(SRC, "pages")) && !next.includes(".test.")) seen.add(next);
  }
  return [...seen];
}

const CYRILLIC = /[\u0400-\u04FF]/u;

/** Рядкові літерали з кирилицею: підписи інтерфейсу й редакційний текст. */
function cyrillicStrings(text) {
  return [...text.matchAll(/"([^"\n]*)"|`([^`\n]*)`/g)]
    .map((m) => m[1] ?? m[2] ?? "")
    .filter((value) => CYRILLIC.test(value));
}

/**
 * Клас екрана за тим, що він робить, а не за назвою файла.
 *
 * `PageEditorField` — теж контент: редактор показує ту саму `page_data`, лише
 * текст у ній редагований, тож за джерелом вмісту він не «екран даних».
 */
function classify(text) {
  if (
    /PageRenderer|ZoneRenderer|PageEditorField|parsePageConfig|buildPageConfig|api\/scenario/.test(
      text,
    )
  ) {
    return "контент";
  }
  // Запит видно і без літерала `/api/`: сторінка кличе `apiFetch` або хук, а
  // адресу збирає модуль у `shared/api`.
  if (/\/api\/|@\/shared\/api|apiFetch|apiFetchRaw/.test(text)) return "дані";
  return "код";
}

function endpointsOf(text) {
  return [...new Set([...text.matchAll(/["`](\/api\/[a-z0-9/_-]+)/g)].map((m) => m[1]))].sort();
}

function main() {
  const router = stripComments(read(ROUTER));
  const constants = routeConstants();
  const imports = routerImports(router);

  // Записи роутера: `path:` (або `index: true`) і `element:` за ним. Елемент
  // стоїть після шляху, і наступний шлях закриває попередній.
  const marks = [
    ...router.matchAll(/path:\s*(`[^`]*`|"[^"]*"|[A-Za-z_$][\w$]*)|index:\s*true/g),
  ].map((match) => ({ at: match.index, path: match[1] ? resolvePath(match[1], constants) : "/" }));

  const rows = [];
  const seenPaths = new Set();
  for (const [i, mark] of marks.entries()) {
    const next = marks[i + 1]?.at ?? router.length;
    const element = router.slice(mark.at, next).match(/element:\s*<(?:\w+\.)?(\w+)/);
    const name = element?.[1] ?? null;
    const spec = name ? imports.get(name) : undefined;
    const entry = spec ? moduleFile(spec, ROUTER) : null;
    const key = `${mark.path}#${name}`;
    if (seenPaths.has(key)) continue;
    seenPaths.add(key);

    const files = entry ? screenFiles(entry) : [];
    const text = files.map((file) => stripComments(read(file))).join("\n");
    const strings = cyrillicStrings(text);
    const prose = strings.filter((value) => value.length >= 40 && value.includes(" "));

    rows.push({
      path: mark.path,
      screen: name ?? "?",
      entry,
      // `<Navigate>` — переадресація, а не екран: їй нема чого мати в інвентарі.
      kind: name === "Navigate" ? "переадресація" : classify(text),
      files: files.length,
      lines: files.reduce((sum, file) => sum + read(file).split("\n").length, 0),
      labels: strings.length,
      prose: prose.length,
      endpoints: endpointsOf(text),
    });
  }

  const width = Math.max(...rows.map((row) => row.path.length), 4);
  console.log("\nЕкран".padEnd(width + 2) + "Клас     Екран (модуль)");
  for (const row of rows) {
    const endpoint = row.endpoints.length > 0 ? ` → ${row.endpoints.join(", ")}` : "";
    console.log(
      row.path.padEnd(width + 2) +
        `${row.kind}  ${row.screen}` +
        `  ${row.lines} р. · ${row.labels} підписів · ${row.prose} абзаців` +
        endpoint,
    );
  }

  // Один компонент може стояти на двох маршрутах (`assessments` і
  // `assessments/:key`) — рахуємо його раз, інакше підсумок бреше вдвічі.
  const unique = [...new Map(rows.map((row) => [row.entry ?? row.screen, row])).values()];
  const by = (kind) => unique.filter((row) => row.kind === kind).length;
  const sum = (pick) => unique.reduce((total, row) => total + pick(row), 0);
  console.log(
    `\n${rows.length} маршрутів, ${unique.length} екранів: контент ${by("контент")},` +
      ` дані ${by("дані")}, код ${by("код")}.` +
      `\n${sum((row) => row.lines)} рядків, ${sum((row) => row.labels)} кириличних підписів,` +
      ` ${sum((row) => row.prose)} абзаців у коді.`,
  );

  const worst = [...rows]
    .sort((a, b) => b.prose - a.prose)
    .slice(0, 5)
    .filter((r) => r.prose > 0);
  if (worst.length > 0) {
    console.log("\nНайбільше тексту в коді:");
    for (const row of worst) console.log(`  ${row.path} — ${row.prose} абзаців (${row.screen})`);
  }
}

main();
