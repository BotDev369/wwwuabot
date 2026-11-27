/**
 * Контент належить проєкту: SQL до контентної таблиці дозволений лише у файлах
 * `ALLOWED` і лише з `tenant_id`. Забутий фільтр — витік, тому виняток можна
 * завести тільки з причиною. Правило й причини: `docs/DECISIONS.md` D27.
 *
 * @module scripts/check-tenancy
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

import { stripComments } from "./lib/files.mjs";

const ROOTS = ["api-dev/src", "bot-dev/src", "packages/shared/src"];

/** Реєстр схеми — єдине місце, де `CREATE TABLE` контенту законний. */
const SKIP = new Set(["packages/shared/src/database/tables.ts"]);

/** Таблиці, рядок у яких належить проєкту. */
const CONTENT_TABLES = ["platform_pages", "platform_screens", "bot_scenarios", "slug_aliases"];

/**
 * Де контент читають і пишуть. Реєстр схеми — не запит, тому його тут немає:
 * він єдине місце, де `CREATE TABLE` контенту законний (`check:db`).
 */
const ALLOWED = new Set([
  "api-dev/src/controllers/scenarios.controller.ts",
  "api-dev/src/controllers/scenarios-admin.controller.ts",
  "api-dev/src/controllers/screens.controller.ts",
  "api-dev/src/controllers/pages.controller.ts",
  "api-dev/src/controllers/redirect.controller.ts",
  "api-dev/src/controllers/search.controller.ts",
  "api-dev/src/controllers/research.controller.ts",
  "api-dev/src/controllers/shop.controller.ts",
  "api-dev/src/services/pages.service.ts",
  "api-dev/src/services/aliases.service.ts",
  "api-dev/src/services/research.service.ts",
  "api-dev/src/services/search/index.ts",
  "api-dev/src/services/shop/shops.ts",
  "api-dev/src/services/favorites.service.ts",
  "api-dev/src/services/messages/links.ts",
  "api-dev/src/services/users.service.ts",
  "bot-dev/src/modules/search/cart.repository.ts",
  "packages/shared/src/shop/cart-store.ts",
  "bot-dev/src/repositories/scenario.repository.ts",
]);

/**
 * Запити без `tenant_id`, кожен — із причиною. Це не «дозволено забути»:
 * список читається очима на рев'ю, і новий рядок тут означає нове рішення.
 */
const EXEMPT = [
  {
    file: "api-dev/src/services/shop/shops.ts",
    contains: "FROM platform_pages",
    reason: "магазин резолвиться за id/slug; публічний магазин публічний, керування — за роллю",
  },
  {
    file: "api-dev/src/services/favorites.service.ts",
    contains: "platform_pages",
    reason: "обране — дані людини, а не проєкту (рішення власника)",
  },
  {
    file: "api-dev/src/services/messages/links.ts",
    contains: "platform_pages",
    reason: "зв'язок двох людей через замовлення, не контент проєкту",
  },
  {
    file: "bot-dev/src/modules/search/cart.repository.ts",
    contains: "platform_pages",
    reason: "кошик резолвить публічний магазин за id; сам кошик — дані покупця",
  },
  {
    file: "packages/shared/src/shop/cart-store.ts",
    contains: "platform_pages",
    reason: "той самий кошик: магазин за id, публічний за визначенням",
  },
  {
    file: "api-dev/src/services/users.service.ts",
    contains: "bot_scenarios",
    reason: "легасі-запит із неіснуючою колонкою: завжди падає в fallback, контенту не віддає",
  },
];

/**
 * Шматок запиту від ключового слова: шаблонні `${...}` усередині SQL ламають
 * розбір лапок, тому беремо вікно тексту, а не «рядок цілком». 700 символів
 * із запасом покривають найдовший запит репозиторію.
 */
const STATEMENT = /(?:SELECT\s|INSERT\s+(?:OR\s+\w+\s+)?INTO\s|UPDATE\s|DELETE\s+FROM\s)/gi;

function sqlStatements(source) {
  const found = [];
  for (const match of source.matchAll(STATEMENT)) {
    found.push(source.slice(match.index, match.index + 700));
  }
  return found;
}

function walk(root, files = []) {
  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules") continue;
      walk(path, files);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      files.push(path);
    }
  }
  return files;
}

const problems = [];

for (const root of ROOTS) {
  for (const path of walk(root)) {
    const file = relative(".", path).split(sep).join("/");
    if (SKIP.has(file)) continue;
    const source = stripComments(readFileSync(path, "utf8"));

    for (const table of CONTENT_TABLES) {
      if (!new RegExp(`\\b${table}\\b`).test(source)) continue;

      if (!ALLOWED.has(file)) {
        problems.push(
          `${file}: ${table} за межами шару доступу — додай файл у ALLOWED або читай через сервіс`,
        );
        continue;
      }

      for (const statement of sqlStatements(source)) {
        if (!new RegExp(`\\b${table}\\b`).test(statement)) continue;
        if (/\btenant_id\b/.test(statement)) continue;
        if (EXEMPT.some((rule) => rule.file === file && statement.includes(rule.contains)))
          continue;
        problems.push(
          `${file}: запит до ${table} без tenant_id — ${statement.replace(/\s+/g, " ").slice(0, 90)}`,
        );
      }
    }
  }
}

if (problems.length > 0) {
  console.error("check:tenancy — контент без проєкту:\n");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(`\n${problems.length} проблем(и).`);
  process.exit(1);
}

console.log(
  `check:tenancy — ok (${CONTENT_TABLES.length} контентні таблиці, ${ALLOWED.size} файлів)`,
);
