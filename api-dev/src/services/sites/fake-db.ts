/**
 * Тестовий двійник D1 для модулів `services/sites`.
 *
 * Це **не** SQL-рушій: двійник нічого не парсить і нічого не виконує сам. Рішення,
 * що повернути на конкретний запит, ухвалює тест — своєю функцією-розпізнавачем.
 * Така межа обрана свідомо:
 *
 * - двійник **не мовчить**: якщо тест не передбачив запит, `resolve` поверне
 *   `null`, і код-під-тестом зазвичай теж поверне `null` — тобто тест упаде, а не
 *   тихо пройде;
 * - журнал запитів дозволяє перевіряти те, що не видно в результаті: чи взагалі
 *   був `UPDATE` (напр. «не можна опублікувати повз чергу» = жодного запису).
 *
 * Запити зберігаються розділеними: `reads` (SELECT), `writes` (INSERT/UPDATE/DELETE)
 * і `schema` (CREATE/DROP/ALTER і `PRAGMA table_info`). Без цього поділу
 * `ensureSitesTables` забивав би журнал записів десятьма `CREATE`-ами, а
 * перевірка «жодного запису» стала б брехнею. Прагма теж стосується схеми, а не
 * даних: вона лише питає, які колонки вже є, — тому в журналі `reads` її немає.
 *
 * @module api-dev/src/services/sites/fake-db
 */

import type { SitePageRow, SiteRow, TemplateRow } from "@wwwuabot/shared/types/site";

/** Виконаний запит разом із його параметрами. */
export interface FakeQuery {
  sql: string;
  bindings: unknown[];
}

/** Що повернути на запит. Тест вирішує це сам. */
export type FakeResolver = (sql: string, bindings: unknown[]) => unknown;

export interface FakeDb {
  db: D1Database;
  /** Виконані `SELECT`-и. */
  reads: FakeQuery[];
  /** Виконані зміни даних (`INSERT` / `UPDATE` / `DELETE`). */
  writes: FakeQuery[];
  /** `CREATE` / `DROP` / `ALTER` / `PRAGMA` — схема, а не робота з даними. */
  schema: string[];
  /** Скільки разів виконано зміну, чий SQL містить `part`. */
  countWrites: (part: string) => number;
}

function kindOf(sql: string): "read" | "schema" | "write" {
  if (/^SELECT/i.test(sql)) return "read";
  if (/^(CREATE|DROP|ALTER|PRAGMA)/i.test(sql)) return "schema";
  return "write";
}

export function createFakeDb(resolve: FakeResolver = () => null): FakeDb {
  const reads: FakeQuery[] = [];
  const writes: FakeQuery[] = [];
  const schema: string[] = [];

  const prepare = (rawSql: string) => {
    // Пробіли згортаються, щоб `startsWith` у тестах не залежав від відступів у шаблоні.
    const sql = rawSql.replace(/\s+/g, " ").trim();
    const kind = kindOf(sql);
    let bindings: unknown[] = [];

    const statement = {
      bind(...args: unknown[]) {
        bindings = args;
        return statement;
      },
      async first() {
        if (kind === "read") reads.push({ sql, bindings });
        return (resolve(sql, bindings) as SiteRow | null) ?? null;
      },
      async all() {
        if (kind === "read") reads.push({ sql, bindings });
        const result = resolve(sql, bindings);
        return Array.isArray(result)
          ? { results: result }
          : ((result as object) ?? { results: [] });
      },
      async run() {
        if (kind === "write") writes.push({ sql, bindings });
        if (kind === "schema") schema.push(sql);
        return (resolve(sql, bindings) as object) ?? { meta: { changes: 1 } };
      },
    };

    return statement;
  };

  return {
    db: { prepare } as unknown as D1Database,
    reads,
    writes,
    schema,
    countWrites: (part: string) => writes.filter((w) => w.sql.includes(part)).length,
  };
}

// ── Фабрики рядків ───────────────────────────────────────────

/** Рядок таблиці `sites` з передбачуваними значеннями. */
export function siteRow(overrides: Partial<SiteRow> = {}): SiteRow {
  return {
    id: "site-1",
    slug: "my-site",
    title: "Мій сайт",
    description: null,
    owner_id: 1,
    status: "draft",
    template_id: null,
    settings: "{}",
    is_public: 0,
    thumbnail: null,
    reject_reason: null,
    created_at: "2026-09-13 09:00:00",
    updated_at: "2026-09-13 09:00:00",
    published_at: null,
    ...overrides,
  };
}

/** Рядок таблиці `site_pages`. За замовчуванням належить `site-1`. */
export function pageRow(overrides: Partial<SitePageRow> = {}): SitePageRow {
  return {
    id: "page-1",
    site_id: "site-1",
    slug: "home",
    title: "Головна",
    page_data: '{"version":1,"zones":{"sidebar":[],"header":[],"main":[],"footer":[]}}',
    order_index: 0,
    status: "draft",
    meta: "{}",
    created_at: "2026-09-13 09:00:00",
    updated_at: "2026-09-13 09:00:00",
    published_at: null,
    ...overrides,
  };
}

/** Рядок таблиці `templates`. За замовчуванням — приватний шаблон користувача 1. */
export function templateRow(overrides: Partial<TemplateRow> = {}): TemplateRow {
  return {
    id: "tpl-1",
    name: "Мій шаблон",
    description: null,
    type: "page",
    thumbnail: null,
    config: "{}",
    is_system: 0,
    owner_id: 1,
    tags: "[]",
    created_at: "2026-09-13 09:00:00",
    ...overrides,
  };
}
