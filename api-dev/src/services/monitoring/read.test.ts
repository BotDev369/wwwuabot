/**
 * Тести читання історії зрізів.
 *
 * Головне тут — **не числа, а ключі**. Точка історії несе `totals`, і його
 * читають чужі функції (`metricSeries` — графік, `SnapshotHistory` — таблиця).
 * Якщо словник скласти з самої метрики, він виглядатиме заповненим, а кожне
 * число стане нулем: `Record<string, number>` приймає обидва формати, тож ні
 * компілятор, ні рев'ю цього не побачать — тільки сторінка, де замість
 * динаміки рівна лінія по нулях.
 *
 * Тому тест читає історію **тими самими очима, що й сторінка**, і вимагає
 * справжніх чисел, а не «словник не порожній».
 *
 * @module api-dev/src/services/monitoring/read.test
 */

import { describe, expect, it } from "vitest";
import { TOTAL_GROUP, metricSeries } from "@wwwuabot/shared/monitoring";
import type { Env } from "../../shared/types";
import { readHistory } from "./read";
import type { SnapshotRow, ValueRow } from "./rows";

function snapshotRow(id: number, collectedAt: string): SnapshotRow {
  return {
    id,
    collected_at: collectedAt,
    trigger_kind: "manual",
    status: "ok",
    git_ref: "85a6045d964e89f9cb003cc2aa74ffc3ed44e002",
    collectors: "[]",
  };
}

function valueRow(snapshotId: number, metric: string, value: number): ValueRow {
  return { snapshot_id: snapshotId, group_key: TOTAL_GROUP, metric, value };
}

/**
 * D1 у мініатюрі: два запити `readHistory` діляться за SQL, а не за порядком
 * виклику — інакше тест ламався б від будь-якої зміни в реалізації.
 */
function fakeEnv(snapshots: SnapshotRow[], values: ValueRow[]): Env {
  const db = {
    prepare: (sql: string) => ({
      bind: () => ({
        all: async (): Promise<{ results: unknown[] }> => ({
          results: sql.includes("metrics_snapshots") ? snapshots : values,
        }),
      }),
    }),
  };

  return { DB: db } as unknown as Env;
}

describe("readHistory", () => {
  const snapshots = [
    snapshotRow(2, "2026-09-24T19:04:45.201Z"),
    snapshotRow(1, "2026-09-24T13:17:24.821Z"),
  ];
  const values = [valueRow(1, "code.lines", 100), valueRow(2, "code.lines", 250)];

  it("віддає динаміку, а не нулі: графік читає історію тим самим ключем", async () => {
    const history = await readHistory(fakeEnv(snapshots, values));

    expect(metricSeries(history, "code.lines")).toEqual([100, 250]);
  });

  it("точка несе стан, розклад і коміт — щоб зріз можна було впізнати", async () => {
    const [latest] = await readHistory(fakeEnv(snapshots, values));

    expect(latest).toMatchObject({
      id: 2,
      status: "ok",
      trigger: "manual",
      ref: "85a6045d964e89f9cb003cc2aa74ffc3ed44e002",
    });
  });

  it("порожня база — порожня історія, а не помилка", async () => {
    expect(await readHistory(fakeEnv([], []))).toEqual([]);
  });

  it("показник, якого в зрізі немає, лишається нулем — «не міряли» не вигадується", async () => {
    const history = await readHistory(fakeEnv(snapshots, values));

    expect(metricSeries(history, "github.stars")).toEqual([0, 0]);
  });
});
