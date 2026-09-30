/**
 * Читання результатів: **старі рядки не мають зникати зі списку.**
 *
 * `scale_key` з'явився разом із другим блоком у «Тревожності і депресії».
 * Рядки, записані до того, мають порожній ключ, а список шукає результат за
 * парою «тест:шкала» — тому без підстановки вони просто перестали б
 * показуватися: чотири результати WHO-5 у власника просто зникли б з екрана.
 *
 * Підстановка можлива лише для тесту з **однією** шкалою: тоді рядок належить
 * їй за визначенням. Для тесту з двома шкалами вгадувати нічого не можна —
 * краще не показати, ніж показати не ту.
 *
 * @module api-dev/src/services/assessments.service.test
 */

import { describe, expect, it } from "vitest";
import { listAssessments } from "./assessments.service";

interface ResultRow {
  id: number;
  test_key: string;
  scale_key: string | null;
  answers: string | null;
  raw: number | null;
  percent: number | null;
  band_key: string | null;
  needs_attention: number | null;
  created_at: string | null;
}

/** Рядок бази з мінімальним набором полів, як його віддає D1. */
function row(overrides: Partial<ResultRow>): ResultRow {
  return {
    id: 1,
    test_key: "who5",
    scale_key: null,
    answers: "[]",
    raw: 20,
    percent: 80,
    band_key: "high",
    needs_attention: 0,
    created_at: "2026-09-20 10:00:00",
    ...overrides,
  };
}

/** База, що віддає задані рядки. */
function dbWith(rows: ResultRow[]): D1Database {
  return {
    prepare: () => ({ bind: () => ({ all: async () => ({ results: rows }) }) }),
  } as unknown as D1Database;
}

describe("listAssessments", () => {
  it("старий рядок тесту з однією шкалою отримує ключ своєї шкали", async () => {
    const records = await listAssessments(dbWith([row({})]), "42");

    // Без цієї підстановки список шукає «who5:wellbeing», а рядок мав «who5:» —
    // і чотири результати власника зникли б з екрана без жодної помилки.
    expect(records[0]?.scaleKey).toBe("wellbeing");
  });

  it("нові рядки з ключем не переписуються", async () => {
    const records = await listAssessments(
      dbWith([row({ scale_key: "mood" }), row({ id: 2, scale_key: "anxiety" })]),
      "42",
    );

    expect(records.map((record) => record.scaleKey)).toEqual(["mood", "anxiety"]);
  });

  it("тест, якого вже немає в реєстрі, лишається без ключа шкали", async () => {
    // `phq9` і `gad7` вийшли з реєстру, коли стали шкалами одного тесту. Їхні
    // старі рядки лишаються в базі, але нічого собою не підміняють: вигадана
    // шкала показала б «результат» під назвою, якої в тесті немає.
    const records = await listAssessments(dbWith([row({ test_key: "phq9" })]), "42");

    expect(records[0]?.scaleKey).toBe("");
  });

  it("порожня база дає порожній список, а не виняток", async () => {
    await expect(listAssessments(dbWith([]), "42")).resolves.toEqual([]);
  });
});
