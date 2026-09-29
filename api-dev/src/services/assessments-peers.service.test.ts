/**
 * Агрегат «скільки людей у смузі»: **одна людина — один голос, і нічого
 * ідентифікуючого на виході.**
 *
 * Перевіряється саме те, що не видно з типу `PeerTallies`:
 *
 *  1. **Запит бере останній результат кожної людини.** Множина `MAX(id)` у
 *     групі `owner_id + test_key` — це і є «один голос». Без неї п'ять
 *     проходжень однієї людини переважували б чотири інші, і блок показував би
 *     не людей, а кількість тестів.
 *  2. **Відповідь не містить `owner_id`.** Навіть якщо запит його Select-ить у
 *     підзапиті, назовно він не виходить: рахунок настільки спільний, що в
 *     ньому немає чого ідентифікувати.
 *  3. **Рядки, зібрані не тим запитом, ламаються тихо.** Не число в `people` —
 *     це пропущений рядок, а не `NaN`, який потім помножиться на розподіл.
 *
 * @module api-dev/src/services/assessments-peers.service.test
 */

import { describe, expect, it, vi } from "vitest";
import { peerTallies } from "./assessments-peers.service";

interface TallyRow {
  test_key: string | null;
  band_key: string | null;
  people: number | null;
}

/** База, що віддає задані рядки агрегату й запам'ятовує SQL. */
function dbWith(rows: TallyRow[]): { db: D1Database; sql: () => string } {
  let captured = "";
  const db = {
    prepare(sql: string) {
      captured = sql;
      return {
        all: async () => ({ results: rows }),
      };
    },
  } as unknown as D1Database;
  return { db, sql: () => captured };
}

describe("peerTallies", () => {
  it("рахує останній результат кожної людини, а не кожен рядок", async () => {
    const { db, sql } = dbWith([
      { test_key: "phq9", band_key: "phq_mild", people: 7 },
      { test_key: "gad7", band_key: "gad_minimal", people: 3 },
    ]);

    const tallies = await peerTallies(db);

    // `MAX(id)` у групі `owner_id + test_key` — це і є «один голос на людину».
    // Без нього людина, яка п'ять разів пройшла тест, важила б п'ять.
    expect(sql()).toContain("MAX(id)");
    expect(sql()).toContain("GROUP BY owner_id, test_key");
    expect(tallies).toEqual({
      phq9: { phq_mild: 7 },
      gad7: { gad_minimal: 3 },
    });
  });

  it("не віддає назовні нічого ідентифікуючого", async () => {
    const { db } = dbWith([{ test_key: "who5", band_key: "middle", people: 5 }]);

    const tallies = await peerTallies(db);

    // У відповіді можуть бути лише ключ смуги й число людей. `owner_id`,
    // дата чи відповідь зникли б — і тоді рахунок можна було б розкласти на
    // конкретну людину.
    expect(Object.keys(tallies)).toEqual(["who5"]);
    expect(Object.keys(tallies.who5)).toEqual(["middle"]);
    expect(JSON.stringify(tallies)).not.toContain("owner");
  });

  it("рядок, зібраний не тим запитом, пропускається, а не перетворюється на NaN", async () => {
    const { db } = dbWith([
      { test_key: "phq9", band_key: "phq_mild", people: 4 },
      { test_key: null, band_key: "phq_mild", people: 99 },
      { test_key: "phq9", band_key: null, people: 99 },
      { test_key: "phq9", band_key: "phq_minimal", people: 0 },
    ]);

    const tallies = await peerTallies(db);

    expect(tallies).toEqual({ phq9: { phq_mild: 4 } });
  });

  it("порожня база дає порожній рахунок, а не виняток", async () => {
    const all = vi.fn().mockResolvedValue({ results: [] });
    const db = { prepare: () => ({ all }) } as unknown as D1Database;

    await expect(peerTallies(db)).resolves.toEqual({});
  });
});
