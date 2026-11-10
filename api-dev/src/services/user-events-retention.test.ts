/**
 * Прибирання журналу: межа рахується від переданого часу, а не від годинника,
 * і `DELETE` звужений до однієї умови — інакше крон стер би журнал цілком.
 *
 * @module api-dev/src/services/user-events-retention.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { EVENT_RETENTION_DAYS, pruneOldEvents } from "./user-events-retention";

interface Call {
  sql: string;
  values: unknown[];
}

/** Заглушка D1: записує запити й віддає задану кількість змінених рядків. */
function fakeDb(changes: number): { env: Env; calls: Call[] } {
  const calls: Call[] = [];
  const db = {
    prepare(sql: string) {
      const statement = {
        bind(...values: unknown[]) {
          calls.push({ sql, values });
          return statement;
        },
        async run() {
          return { meta: { changes } };
        },
      };
      return statement;
    },
  };
  return { env: { DB: db } as unknown as Env, calls };
}

const NOW = Date.parse("2026-11-10T12:00:00.000Z");

describe("прибирання журналу дій", () => {
  it("видаляє рядки, старші за термін, одним `DELETE` з межею", async () => {
    const { env, calls } = fakeDb(7);

    const removed = await pruneOldEvents(env, NOW);

    expect(removed).toBe(7);
    const remove = calls.filter((call) => call.sql.startsWith("DELETE FROM user_events"));
    expect(remove).toHaveLength(1);
    expect(remove[0]?.sql).toBe("DELETE FROM user_events WHERE created_at < ?");
    // 10.11.2026 мінус 180 днів — 14.05.2026, і саме з мілісекундами: та сама
    // форма, у якій журнал пише `recordUserEvent`.
    expect(remove[0]?.values).toEqual(["2026-05-14 12:00:00.000"]);
  });

  it("термін — півроку, а не «все, що не сьогодні»", async () => {
    const { env, calls } = fakeDb(0);

    await pruneOldEvents(env, NOW);

    const [cutoff] = calls.find((call) => call.sql.startsWith("DELETE FROM user_events"))
      ?.values as [string];
    const days = (NOW - Date.parse(`${cutoff.replace(" ", "T")}Z`)) / 86_400_000;
    expect(EVENT_RETENTION_DAYS).toBe(180);
    expect(Math.round(days)).toBe(180);
  });

  it("нічого не прибрано — нуль, а не помилка", async () => {
    const { env } = fakeDb(0);

    await expect(pruneOldEvents(env, NOW)).resolves.toBe(0);
  });
});
