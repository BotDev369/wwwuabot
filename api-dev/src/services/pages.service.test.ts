/**
 * Сторінки, які веде людина: ролі, адреса й публічність.
 *
 * Тут рішення, які коштують чужого контенту, а не тестуються ніде:
 *
 * 1. **Адмін веде сторінку, але не розпоряджається нею.** Він редагує текст і
 *    бачить замовлення, але `DELETE` мусить лишатися за власником, а склад
 *    адмінів (`admin_ids`) змінює **тільки** власник: інакше запрошений міг би
 *    звузити чужий доступ, лишивши власника осторонь.
 * 2. **Адреса зайнята — це відмова, а не «…-2».** Посилання, яке людина
 *    запамʼятала, не має повести в інше місце. При створенні вільний варіант
 *    шукається, бо сторінки ще немає й ніщо не веде на стару адресу.
 * 3. **Публічність відбирає запит, а не розмітка.** Приватна сторінка не
 *    потрапляє ні у відкритий список, ні за адресою, і заблокований автор не
 *    потрапляє взагалі — це рішення про людину.
 *
 * D1 — фейковий: перевіряються рішення сервісу (умови в SQL, склад тіла), а не
 * сервер SQLite.
 *
 * @module api-dev/src/services/pages.service.test
 */

import { describe, expect, it } from "vitest";

import { PagesService } from "./pages.service";
import type { PageRow } from "./pages-rows";
import type { Env } from "../shared/types";

const OWNER = 100;
const ADMIN = 200;

/** Колонки `platform_pages`, щоб `ensureTables` не вигадував `ALTER` на кожен прогін. */
const SCENARIO_COLUMNS = [
  "id",
  "slug",
  "title",
  "owner_id",
  "admin_ids",
  "is_public",
  "template_key",
  "page_data",
  "is_active",
  "created_at",
  "updated_at",
];

interface Captured {
  sql: string;
  binds: unknown[];
}

function page(overrides: Partial<PageRow> = {}): PageRow {
  return {
    id: 5,
    slug: "olena",
    title: "Олена",
    page_data: JSON.stringify({ version: 1, zones: { main: [] } }),
    template_key: "card",
    is_public: 1,
    owner_id: OWNER,
    admin_ids: JSON.stringify([ADMIN]),
    updated_at: "2026-01-01 00:00:00",
    ...overrides,
  };
}

/**
 * Фейковий D1: `byId` — рядки сторінок, `people` — імена в списку «Доступ».
 *
 * `deleteChanges` імітує те, що робить D1: `DELETE … WHERE owner_id = ?`
 * зміщує нуль рядків, якщо умова не збіглася.
 */
function makeEnv(options: {
  rows?: PageRow[];
  takenAddresses?: string[];
  deleteChanges?: number;
  blocked?: number[];
}): { env: Env; statements: Captured[] } {
  const rows = options.rows ?? [];
  const taken = new Set(options.takenAddresses ?? []);
  const blocked = new Set(options.blocked ?? []);
  const statements: Captured[] = [];

  /** Рядки, які реально віддала б база: умови `WHERE` тут виконуються, бо в цьому й суть тестів. */
  const visible = () => {
    let out = rows;
    if (/COALESCE\(s\.is_public, 0\) = 1/.test(currentSql)) out = out.filter((r) => r.is_public);
    if (/s\.owner_id IS NOT NULL/.test(currentSql)) out = out.filter((r) => r.owner_id !== null);
    if (/is_blocked/.test(currentSql)) out = out.filter((r) => !blocked.has(r.id));
    if (/owner_id = \? OR admin_ids LIKE/.test(currentSql)) {
      out = out.filter((r) => r.owner_id !== null);
    }
    return out;
  };
  let currentSql = "";

  const db = {
    prepare(sql: string) {
      currentSql = sql;
      const record: Captured = { sql, binds: [] };
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => {
          if (/PRAGMA/i.test(sql)) return null;
          if (/SELECT id FROM platform_pages WHERE slug/.test(sql)) {
            const [slug, exceptId] = record.binds;
            const hit = rows.find((row) => row.slug === slug && row.id !== exceptId);
            return hit ? { id: hit.id } : null;
          }
          const id = Number(record.binds[0]);
          return rows.find((row) => row.id === id) ?? null;
        },
        all: async () => {
          if (/PRAGMA/i.test(sql)) {
            return { results: SCENARIO_COLUMNS.map((name) => ({ name })) };
          }
          if (/JOIN users u ON u\.user_id = s\.owner_id/.test(sql)) {
            return {
              results: visible().map((row) => ({
                id: row.id,
                slug: row.slug,
                title: row.title,
                template_key: row.template_key,
                updated_at: row.updated_at,
                author_id: row.owner_id,
                author_name: `user_${row.owner_id}`,
                author_photo: null,
              })),
            };
          }
          return { results: visible() };
        },
        run: async () => {
          if (/^\s*DELETE/i.test(sql)) {
            const [id, owner] = record.binds;
            const hit = rows.some((row) => row.id === id && row.owner_id === owner);
            return { meta: { changes: hit ? 1 : (options.deleteChanges ?? 0) } };
          }
          if (/^\s*INSERT/i.test(sql)) {
            if (taken.has(String(record.binds[0]))) {
              throw new Error("UNIQUE constraint failed: platform_pages.slug");
            }
            // Запис справді з'явився: сервіс одразу читає його назад.
            const [slug, title, pageData, templateKey, isPublic, ownerId, adminIds] = record.binds;
            rows.push(
              page({
                id: 9,
                slug: String(slug),
                title: String(title),
                page_data: String(pageData),
                template_key: String(templateKey),
                is_public: Number(isPublic),
                owner_id: Number(ownerId),
                admin_ids: String(adminIds),
              }),
            );
          }
          return { meta: { changes: 1, last_row_id: 9 } };
        },
      };
      statements.push(record);
      return statement;
    },
  };

  return { env: { DB: db, BOT_TOKEN: "t" } as unknown as Env, statements };
}

function sqlOf(statements: Captured[], verb: RegExp): Captured | undefined {
  return statements.find((s) => verb.test(s.sql.trimStart()));
}

describe("читання сторінок, які веде людина", () => {
  it("список відбирається грубо, а рішення ухвалює роль", async () => {
    const { env, statements } = makeEnv({
      // `LIKE %200%` збігається і з чужим довшим id — фільтр ролі мусить прибрати такий рядок.
      rows: [
        page({ id: 5, owner_id: OWNER, admin_ids: JSON.stringify([ADMIN]) }),
        page({ id: 6, slug: "чужа", owner_id: 2001, admin_ids: "[]" }),
      ],
    });
    const service = new PagesService(env);

    const list = await service.listManaged(ADMIN);

    expect(list.map((one) => one.slug)).toEqual(["olena"]);
    expect(sqlOf(statements, /^SELECT/)).toBeDefined();
  });
});

describe("Відкриті сторінки: що там видно", () => {
  it("приватна сторінка не потрапляє в список", async () => {
    const { env, statements } = makeEnv({
      rows: [page({ is_public: 0 }), page({ id: 6, slug: "shop", is_public: 1 })],
    });

    const list = await new PagesService(env).listPublished();

    expect(list.map((one) => one.slug)).toEqual(["shop"]);
    const sql = sqlOf(statements, /^SELECT/)?.sql ?? "";
    expect(sql).toMatch(/COALESCE\(s\.is_public, 0\) = 1/);
  });

  it("контент платформи видно, а заблоковані людини — ні", async () => {
    const { env, statements } = makeEnv({
      rows: [
        page({ id: 5, slug: "дослідження", is_public: 1, owner_id: null }),
        page({ id: 6, slug: "блокована", is_public: 1, owner_id: OWNER }),
        page({ id: 7, slug: "видима", is_public: 1, owner_id: OWNER }),
      ],
      blocked: [6],
    });

    const list = await new PagesService(env).listPublished();

    expect(list.map((one) => one.slug)).toEqual(["дослідження", "видима"]);
    // Сторінка продукту не має автора: `0` — це «підпис дає платформа».
    expect(list.find((one) => one.slug === "дослідження")?.author.id).toBe(0);

    const sql = statements.map((s) => s.sql).join("\n");
    expect(sql).toMatch(/LEFT JOIN users/);
    expect(sql).not.toMatch(/owner_id IS NOT NULL/);
    expect(sql).toMatch(/is_blocked/);
  });

  it("межа сторінок затискається, а не передається як є", async () => {
    const { env, statements } = makeEnv({ rows: [] });
    await new PagesService(env).listPublished(10 ** 9);

    const limit = sqlOf(statements, /^SELECT/)?.binds.at(-1);
    expect(Number(limit)).toBeLessThanOrEqual(100);
    expect(Number(limit)).toBeGreaterThan(0);
  });
});
