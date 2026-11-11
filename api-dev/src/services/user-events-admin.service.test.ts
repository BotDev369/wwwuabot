/**
 * Таблиця динаміки: рахунок іде з полів, які є в журналі з першого дня, тож
 * історія до появи колонки `node` теж показується. Перевіряється те, від чого
 * залежить екран: дні-стовпчики, місця-рядки й те, що шум у них не потрапляє.
 * @module api-dev/src/services/user-events-admin.service.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { readEventMatrix } from "./user-events-admin.service";

/** Мінімальна D1: `ensureTables` бачить порожню схему й створює її сама. */
function database(rows: unknown[]) {
  const db = {
    prepare(sql: string) {
      const statement = {
        bind: () => statement,
        all: async () => (sql.startsWith("PRAGMA") ? { results: [] } : { results: rows }),
        first: async () => null,
        run: async () => ({ meta: { changes: 0 } }),
      };
      return statement;
    },
  };
  return { DB: db } as unknown as Env;
}

const RANGE = { from: "2026-10-01 00:00:00", to: "2026-10-02 00:00:00" };

describe("таблиця динаміки журналу", () => {
  it("рахує місця по днях, а бот і неоголошене лишає за бортом", async () => {
    const env = database([
      { surface: "platform", kind: "view", action: "Трекери", day: "2026-10-01", count: 5 },
      {
        surface: "platform",
        kind: "request",
        action: "POST /api/user/trackers/entry",
        day: "2026-10-02",
        count: 3,
      },
      { surface: "bot", kind: "message", action: "привіт", day: "2026-10-01", count: 9 },
      {
        surface: "platform",
        kind: "request",
        action: "POST /api/unknown",
        day: "2026-10-01",
        count: 7,
      },
    ]);

    const matrix = await readEventMatrix(env, RANGE);

    expect(matrix.days).toEqual(["2026-10-01", "2026-10-02"]);
    expect(matrix.rows).toEqual([
      { key: "platform.trackers", label: "Трекери", depth: 0, total: 5, counts: [5, 0] },
      {
        key: "platform.trackers.trackers.entry",
        label: "Записав трекер",
        depth: 1,
        total: 3,
        counts: [0, 3],
      },
    ]);
    // Бот і неоголошений запис у підсумок не входять: це не місце, за яким стежать.
    expect(matrix.total).toBe(8);
  });

  it("екран без подій не виводиться — таблиця про те, що відбувалося", async () => {
    const matrix = await readEventMatrix(database([]), RANGE);

    expect(matrix.rows).toEqual([]);
    expect(matrix.total).toBe(0);
  });
});
