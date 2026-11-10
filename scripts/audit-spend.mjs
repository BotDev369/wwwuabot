/**
 * Реєстр точок витрат: де код питає D1, KV, R2, кеш і мережу.
 * Analytics знає ціну запиту, але не знає, звідки він узяеся; тут — файл, рядок,
 * вид операції й таблиці. Запуск: `npm run audit:spend` (`--json` — машинний).
 *
 * @module scripts/audit-spend
 */

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOTS = ["api-dev/src", "bot-dev/src", "packages/shared/src"];
const SKIP = /\.(test|dom\.test)\.tsx?$|\.d\.ts$/;
const KV_BINDINGS = new Set(["CONTENT_KV"]);
const R2_BINDINGS = new Set(["SHOP_MEDIA", "MESSAGE_MEDIA", "SPENDING_SNAPSHOTS"]);
const SQL_VERB = /^(SELECT|INSERT|UPDATE|DELETE|WITH|PRAGMA|CREATE|ALTER|DROP|REPLACE)\b/i;
const SQL_TABLE = /\b(?:FROM|INTO|UPDATE|JOIN)\s+([a-z_][a-z0-9_]*)/gi;
const WRITE_VERB = /^(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|REPLACE)\b/i;

async function sourceFiles(dir, out = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await sourceFiles(path, out);
    else if (entry.name.endsWith(".ts") && !SKIP.test(entry.name)) out.push(path);
  }
  return out;
}

function lineAt(text, index) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === "\n") line++;
  return line;
}

function oneLine(text) {
  return String(text ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Літерал після `prepare(`: шаблон, рядок або ім'я змінної зі SQL. */
function literalAt(text, start) {
  let i = start;
  while (i < text.length && /\s/.test(text[i])) i++;
  const quote = text[i];
  if (quote !== "`" && quote !== '"' && quote !== "'") {
    const name = /^[A-Za-z_$][\w$]*/.exec(text.slice(i, i + 60));
    return name ? `<${name[0]}>` : "";
  }
  let out = "";
  for (i += 1; i < text.length; i++) {
    if (text[i] === "\\") {
      out += text[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (text[i] === quote) break;
    out += text[i];
  }
  return out;
}

function tablesOf(sql) {
  const names = new Set();
  for (const match of sql.matchAll(SQL_TABLE)) {
    const name = match[1].toLowerCase();
    if (name !== "select" && name !== "set") names.add(name);
  }
  return [...names];
}

/** Псевдоніми бакетів у файлі: `const bucket = env.SHOP_MEDIA`. */
function bucketAliases(text) {
  const names = new Map();
  for (const match of text.matchAll(/([A-Za-z_$][\w$]*)\s*=\s*(?:this\.)?env\.([A-Z_]+)/g)) {
    if (R2_BINDINGS.has(match[2])) names.set(match[1], match[2]);
  }
  for (const match of text.matchAll(
    /([A-Za-z_$][\w$]*)\s*(?::\s*R2Bucket[^=,)]*)?=\s*(?:this\.)?bucket\(/g,
  )) {
    names.set(match[1], "R2");
  }
  return names;
}

function collect(file, text, sites) {
  const add = (kind, index, op, detail = {}) =>
    sites.push({ file, line: lineAt(text, index), kind, op, ...detail });
  const aliases = bucketAliases(text);

  for (const match of text.matchAll(/\.prepare\(/g)) {
    const sql = oneLine(literalAt(text, match.index + match[0].length));
    const verb = (SQL_VERB.exec(sql)?.[1] ?? "?").toUpperCase();
    const write = WRITE_VERB.test(sql) || /^(PRAGMA|CREATE|ALTER|DROP)/i.test(sql);
    add("D1", match.index, `${verb}${write ? " · запис" : ""}`, {
      sql: sql.slice(0, 220),
      tables: tablesOf(sql),
    });
  }

  for (const match of text.matchAll(/\.batch\(/g)) add("D1 batch", match.index, "пакет запитів");

  for (const match of text.matchAll(
    /(?:env\.|this\.env\.)?([A-Z][A-Z0-9_]{2,})\.(get|put|delete|list|head)(?:<[^>()]*>)?\(/g,
  )) {
    const [, binding, method] = match;
    if (KV_BINDINGS.has(binding)) add("KV", match.index, `${binding}.${method}`);
    else if (R2_BINDINGS.has(binding)) add("R2", match.index, `${binding}.${method}`);
  }

  for (const [alias, binding] of aliases) {
    const pattern = new RegExp(`\\b${alias}\\.(get|put|delete|head|list)(?:<[^>()]*>)?\\(`, "g");
    for (const match of text.matchAll(pattern))
      add("R2", match.index, `${binding}.${match[1]} (${alias})`);
  }

  for (const match of text.matchAll(
    /\b([a-z][\w$]*bucket|bucket)\.(get|put|delete|head|list)(?:<[^>()]*>)?\(/gi,
  )) {
    add("R2", match.index, `бакет.${match[2]} (${match[1]})`);
  }

  for (const match of text.matchAll(/\b(?:caches\.default|cache)\.(match|put)\(/g)) {
    add("Cache", match.index, `кеш.${match[1]}`);
  }

  for (const match of text.matchAll(/fetch\(\s*[`"'](https?:\/\/[^`"']+)/g)) {
    try {
      add("fetch", match.index, new URL(match[1]).host);
    } catch {
      add("fetch", match.index, match[1].slice(0, 60));
    }
  }
}

function printGroup(sites, kind) {
  const rows = sites.filter((site) => site.kind === kind);
  if (!rows.length) return;
  console.log(`\n${kind} — ${rows.length} точок:`);
  for (const site of rows) {
    const detail = site.tables?.length
      ? ` → ${site.tables.join(", ")}`
      : site.sql
        ? ` — ${site.sql.slice(0, 96)}`
        : "";
    console.log(`  ${site.file}:${site.line}  ${site.op}${detail}`);
  }
}

async function crons() {
  const found = [];
  for (const file of ["api-dev/wrangler.toml", "bot-dev/wrangler.toml"]) {
    try {
      const text = await readFile(file, "utf8");
      for (const match of text.matchAll(/^crons\s*=\s*\[(.+)\]\s*$/gm)) {
        found.push({ file, schedule: match[1].trim() });
      }
    } catch {
      continue;
    }
  }
  return found;
}

async function main() {
  const sites = [];
  for (const root of ROOTS) {
    for (const file of await sourceFiles(root)) collect(file, await readFile(file, "utf8"), sites);
  }
  const unique = new Map(sites.map((site) => [`${site.file}:${site.line}:${site.kind}`, site]));
  sites.length = 0;
  sites.push(...unique.values());
  const schedules = await crons();

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ sites, schedules }, null, 2));
    return;
  }

  const perKind = sites.reduce(
    (map, site) => map.set(site.kind, (map.get(site.kind) ?? 0) + 1),
    new Map(),
  );
  const writes = sites.filter((site) => site.kind === "D1" && site.op.includes("запис")).length;
  const byTable = new Map();
  for (const site of sites)
    for (const table of site.tables ?? []) byTable.set(table, (byTable.get(table) ?? 0) + 1);

  console.log(
    `Точки витрат у коді: ${sites.length} у ${new Set(sites.map((site) => site.file)).size} файлах`,
  );
  console.log(
    `  D1: ${perKind.get("D1") ?? 0} (з них записів ${writes}), пакетів ${perKind.get("D1 batch") ?? 0}; ` +
      `KV: ${perKind.get("KV") ?? 0}; R2: ${perKind.get("R2") ?? 0}; ` +
      `кеш: ${perKind.get("Cache") ?? 0}; мережа: ${perKind.get("fetch") ?? 0}`,
  );
  console.log(`  таблиць у запитах: ${byTable.size}`);

  for (const kind of ["D1", "D1 batch", "KV", "R2", "Cache", "fetch"]) printGroup(sites, kind);

  console.log("\nТаблиці за кількістю точок:");
  for (const [table, count] of [...byTable].sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${String(count).padStart(3)}  ${table}`);
  }

  console.log("\nРозклади:");
  for (const one of schedules) console.log(`  ${one.file}  ${one.schedule}`);
}

await main();
