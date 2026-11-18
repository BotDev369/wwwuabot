/**
 * Сценарії, які веде людина: ролі й імена.
 *
 * Тут рішення, яке коштує чужого контенту: **список відбирається грубо, а
 * рішення ухвалює роль**. `admin_ids` лежить JSON-ом, тож `LIKE` звужує
 * кандидатів і може збігтися з довшим чужим id — такий рядок мусить зникнути
 * після перевірки ролі, а не потрапити в клієнт.
 *
 * D1 — фейковий: перевіряються рішення сервісу, а не сервер SQLite.
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

/** Фейковий D1: `rows` — рядки сторінок, `people` — імена в картці «Доступ». */
function makeEnv(options: { rows?: PageRow[]; people?: number[] }): {
  env: Env;
  statements: Captured[];
} {
  const rows = options.rows ?? [];
  const people = new Set(options.people ?? []);
  const statements: Captured[] = [];

  const db = {
    prepare(sql: string) {
      const record: Captured = { sql, binds: [] };
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        // `ensureTables` питає схему й додає відсутні колонки: тут таблиця вже є,
        // тож `first` мовчить, а `run` не змінює нічого.
        first: async () => (/(PRAGMA|SELECT sql FROM)/i.test(sql) ? null : null),
        run: async () => ({ meta: { changes: 0 } }),
        all: async () => {
          if (/PRAGMA/i.test(sql)) {
            return { results: SCENARIO_COLUMNS.map((name) => ({ name })) };
          }
          if (/FROM users/.test(sql)) {
            return {
              results: [...people].map((id) => ({
                user_id: id,
                first_name: `Перший${id}`,
                last_name: null,
                username: null,
                platform_username: `user${id}`,
              })),
            };
          }
          // `owner_id = ? OR admin_ids LIKE ?` — умова, а не просто форма запиту:
          // у тесті вона й мусить відсіяти чуже.
          const [userId, like] = record.binds;
          const needle = String(like).replace(/%/g, "");
          return {
            results: rows.filter(
              (row) => row.owner_id === userId || String(row.admin_ids).includes(needle),
            ),
          };
        },
      };
      statements.push(record);
      return statement;
    },
  };

  return { env: { DB: db, BOT_TOKEN: "t" } as unknown as Env, statements };
}

describe("читання сценаріїв, які веде людина", () => {
  it("список відбирається грубо, а рішення ухвалює роль", async () => {
    const { env, statements } = makeEnv({
      // `LIKE %200%` збігається і з чужим довшим id — фільтр ролі мусить прибрати такий рядок.
      rows: [
        page({ id: 5, owner_id: OWNER, admin_ids: JSON.stringify([ADMIN]) }),
        page({ id: 6, slug: "чужа", owner_id: 2001, admin_ids: "[]" }),
      ],
    });

    const list = await new PagesService(env).listManaged(ADMIN);

    expect(list.map((one) => one.slug)).toEqual(["olena"]);
    expect(statements.some((s) => /^SELECT/.test(s.sql.trimStart()))).toBe(true);
  });

  it("ім'я в картці «Доступ» — з `users`, а не номер", async () => {
    const { env } = makeEnv({
      rows: [page({ id: 5, owner_id: OWNER, admin_ids: "[]" })],
      people: [OWNER],
    });

    const [one] = await new PagesService(env).listManaged(OWNER);

    expect(one.staff).toEqual([{ id: OWNER, name: "#user100", role: "owner" }]);
    expect(one.role).toBe("owner");
  });
});
