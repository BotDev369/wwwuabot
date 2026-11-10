/**
 * Сія тематик: перший вхід пише, наступні — лише читають.
 *
 * Перевіряється те, чого не видно з контролера: що повторне відкриття екрана не
 * робить жодного `INSERT`, а частково засіяне дерево досіюється.
 * @module api-dev/src/services/trackers-seed.test
 */

import { describe, expect, it } from "vitest";
import { TRACKER_CATALOG_GROUPS } from "@wwwuabot/shared/trackers";
import type { Env } from "../shared/types";
import { seedGroups } from "./trackers-seed";

const KEYS = TRACKER_CATALOG_GROUPS.map((group) => group.key);

/** D1, який тримає рядки в пам'яті й лічить читання, батчі та вставки. */
function fakeDb(initialKeys: readonly string[] = []) {
  const rows = initialKeys.map((key, index) => ({ id: index + 1, key }));
  const log = { selects: 0, batches: 0, inserts: 0 };

  const db = {
    prepare(sql: string) {
      const args: unknown[] = [];
      const statement = {
        bind(...next: unknown[]) {
          args.push(...next);
          return statement;
        },
        async all() {
          if (!sql.includes("SELECT id, key FROM tracker_groups")) {
            throw new Error(`unexpected read: ${sql}`);
          }
          log.selects += 1;
          return { results: rows.map((row) => ({ ...row })) };
        },
        async run() {
          if (!sql.includes("INSERT OR IGNORE INTO tracker_groups")) {
            throw new Error(`unexpected write: ${sql}`);
          }
          log.inserts += 1;
          const key = String(args[1]);
          if (!rows.some((row) => row.key === key)) rows.push({ id: rows.length + 1, key });
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
    async batch(statements: readonly { run: () => Promise<unknown> }[]) {
      log.batches += 1;
      for (const statement of statements) await statement.run();
      return [];
    },
  } as unknown as D1Database;

  return { env: { DB: db } as unknown as Env, log };
}

describe("seedGroups", () => {
  it("перший вхід сіє всі тематики каталогу", async () => {
    const { env, log } = fakeDb();
    const themes = await seedGroups(env, 1);

    expect(log.batches).toBe(1);
    expect(log.inserts).toBe(KEYS.length);
    expect(themes.size).toBe(KEYS.length);
    expect(KEYS.every((key) => themes.has(key))).toBe(true);
  });

  it("другий вхід не робить жодного запису", async () => {
    const { env, log } = fakeDb();
    await seedGroups(env, 1);
    const insertsAfterFirst = log.inserts;

    const themes = await seedGroups(env, 1);

    expect(log.inserts).toBe(insertsAfterFirst);
    expect(log.batches).toBe(1);
    expect(themes.size).toBe(KEYS.length);
  });

  it("неповний набір ключів досіюється", async () => {
    const { env, log } = fakeDb(KEYS.slice(0, -1));
    const themes = await seedGroups(env, 1);

    expect(log.batches).toBe(1);
    expect(themes.size).toBe(KEYS.length);
  });
});
