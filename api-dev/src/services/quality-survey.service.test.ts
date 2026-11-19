/**
 * Читання останнього виміру: п'ять шкал одного проходження, а не суміш двох.
 * **Що тут важливо.** Досьє показує **поточний** вимір людини. Якщо взяти
 * рядки двох проходжень, рівень стане сумішшю двох людей — тієї, якою вона
 * була, і тієї, якою стала. Тому «останнє» — це п'ять рядків з однаковим
 * `created_at`, а не п'ять останніх рядків.
 * @module api-dev/src/services/quality-survey.service.test
 */

import { describe, expect, it } from "vitest";
import { latestSurvey } from "./quality-survey.service";

interface Row {
  scale_key: string;
  raw: number;
  percent: number;
  created_at: string;
}

function row(over: Partial<Row> & { scale_key: string }): Row {
  return { raw: 12, percent: 60, created_at: "2026-11-19 10:00:00", ...over };
}

function dbWith(rows: Row[]): D1Database {
  return {
    prepare: () => ({ bind: () => ({ all: async () => ({ results: rows }) }) }),
  } as unknown as D1Database;
}

describe("latestSurvey", () => {
  it("віддає п'ять факторів одного проходження з рівнями зі смуг", async () => {
    const read = await latestSurvey(
      dbWith([
        row({ scale_key: "extraversion", raw: 18 }),
        row({ scale_key: "agreeableness", raw: 12 }),
        row({ scale_key: "conscientiousness", raw: 20 }),
        row({ scale_key: "neuroticism", raw: 8 }),
        row({ scale_key: "openness", raw: 4 }),
      ]),
      "42",
    );

    expect(read?.measuredAt).toBe("2026-11-19 10:00:00");
    expect(read?.factors.map((factor) => factor.factor)).toEqual([
      "extraversion",
      "agreeableness",
      "conscientiousness",
      "neuroticism",
      "openness",
    ]);
    expect(read?.factors.map((factor) => factor.level)).toEqual([4, 3, 5, 2, 1]);
    expect(read?.factors[0]?.evidence).toBe("Екстраверсія — 18 з 20");
  });

  it("друге проходження не змішується з першим", async () => {
    const read = await latestSurvey(
      dbWith([
        row({ scale_key: "extraversion", raw: 20 }),
        row({ scale_key: "openness", raw: 19 }),
        row({ scale_key: "openness", raw: 4, created_at: "2026-10-01 10:00:00" }),
        row({ scale_key: "extraversion", raw: 4, created_at: "2026-10-01 10:00:00" }),
      ]),
      "42",
    );

    expect(read?.factors.map((factor) => factor.factor)).toEqual(["extraversion", "openness"]);
    expect(read?.factors.map((factor) => factor.level)).toEqual([5, 5]);
  });

  it("порожня історія — це «ще не виміряно», а не середній рівень", async () => {
    await expect(latestSurvey(dbWith([]), "42")).resolves.toBeNull();
  });

  it("рядок поза смугами пропускається, а не стає серединою", async () => {
    const read = await latestSurvey(
      dbWith([
        row({ scale_key: "extraversion", raw: 99 }),
        row({ scale_key: "openness", raw: 12 }),
      ]),
      "42",
    );

    expect(read?.factors.map((factor) => factor.factor)).toEqual(["openness"]);
  });
});
