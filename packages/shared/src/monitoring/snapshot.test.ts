/**
 * Тести перетворень зрізу.
 *
 * Головне тут — правило зміни: показник без пари в попередньому зрізі не
 * отримує «динаміки». Без цього перший же новий колектор показав би
 * «+8 000 рядків» там, де нічого не додалося, і сторінка збрехала б рівно
 * один раз — але саме їй після цього не повірять.
 *
 * @module @wwwuabot/shared/monitoring/snapshot.test
 */

import { describe, expect, it } from "vitest";
import {
  diffSnapshots,
  groupValues,
  groupsOf,
  indexValues,
  metricSeries,
  metricValues,
  periodDelta,
  sameRef,
  valueKey,
} from "./snapshot";
import {
  TOTAL_GROUP,
  type MetricValue,
  type MonitoringSnapshot,
  type SnapshotPoint,
} from "./types";

function snapshot(id: number, values: MetricValue[]): MonitoringSnapshot {
  return {
    id,
    collectedAt: `2026-09-0${id}T04:17:00.000Z`,
    trigger: "cron",
    status: "ok",
    ref: null,
    collectors: [],
    values,
  };
}

const previous = snapshot(1, [
  { group: TOTAL_GROUP, metric: "code.lines", value: 1000 },
  { group: "api-dev", metric: "code.lines", value: 400 },
]);

const latest = snapshot(2, [
  { group: TOTAL_GROUP, metric: "code.lines", value: 1250 },
  { group: "api-dev", metric: "code.lines", value: 500 },
  { group: TOTAL_GROUP, metric: "code.files", value: 320 },
]);

describe("словники значень", () => {
  it("ключ значення — група й метрика", () => {
    expect(valueKey("api-dev", "code.files")).toBe("api-dev|code.files");
  });

  it("індексує значення зрізу", () => {
    expect(indexValues(latest.values)["api-dev|code.lines"]).toBe(500);
  });

  it("бере значення однієї групи, типово — `total`", () => {
    expect(groupValues(latest.values)["code.lines"]).toBe(1250);
    expect(groupValues(latest.values, "api-dev")).toEqual({ "code.lines": 500 });
  });

  it("перелічує групи без `total`", () => {
    expect(groupsOf(latest.values)).toEqual(["api-dev"]);
  });
});

describe("динаміка", () => {
  it("рахує зміну по кожній групі окремо", () => {
    expect(diffSnapshots(latest, previous)).toEqual({
      "total|code.lines": 250,
      "api-dev|code.lines": 100,
    });
  });

  it("не вигадує зміну для показника, якого раніше не було", () => {
    expect(diffSnapshots(latest, previous)["total|code.files"]).toBeUndefined();
  });

  it("без попереднього зрізу змін немає", () => {
    expect(diffSnapshots(latest, null)).toEqual({});
    expect(diffSnapshots(null, previous)).toEqual({});
  });
});

describe("історія", () => {
  const history: SnapshotPoint[] = [
    {
      id: 3,
      collectedAt: "c",
      status: "ok",
      trigger: "cron",
      ref: null,
      totals: { [valueKey(TOTAL_GROUP, "code.lines")]: 300 },
    },
    {
      id: 1,
      collectedAt: "a",
      status: "ok",
      trigger: "manual",
      ref: null,
      totals: { [valueKey(TOTAL_GROUP, "code.lines")]: 100 },
    },
    {
      id: 2,
      collectedAt: "b",
      status: "partial",
      trigger: "cron",
      ref: null,
      totals: { [valueKey(TOTAL_GROUP, "code.lines")]: 200 },
    },
  ];

  it("ряд значень іде у хронологічному порядку", () => {
    expect(metricSeries(history, "code.lines")).toEqual([100, 200, 300]);
  });

  it("показник, якого немає у зрізі, — нуль, а не дірка", () => {
    expect(metricSeries(history, "github.stars")).toEqual([0, 0, 0]);
  });
});

describe("таблиця «показник × зріз»", () => {
  const withGap: SnapshotPoint[] = [
    {
      id: 1,
      collectedAt: "a",
      status: "ok",
      trigger: "cron",
      ref: null,
      totals: { [valueKey(TOTAL_GROUP, "code.lines")]: 100 },
    },
    {
      id: 2,
      collectedAt: "b",
      status: "partial",
      trigger: "cron",
      ref: null,
      totals: {},
    },
    {
      id: 3,
      collectedAt: "c",
      status: "ok",
      trigger: "manual",
      ref: null,
      totals: { [valueKey(TOTAL_GROUP, "code.lines")]: 140 },
    },
  ];

  it("зріз без показника — дірка, а не нуль", () => {
    expect(metricValues(withGap, "code.lines")).toEqual([100, undefined, 140]);
  });

  it("зміна за період рахується по виміряних зрізах", () => {
    expect(periodDelta(withGap, "code.lines")).toBe(40);
  });

  it("одного вимірювання замало — динаміки немає", () => {
    expect(periodDelta(withGap.slice(0, 1), "code.lines")).toBeUndefined();
    expect(periodDelta(withGap, "github.stars")).toBeUndefined();
  });
});

describe("спільний коміт", () => {
  const point = (id: number, ref: string | null): SnapshotPoint => ({
    id,
    collectedAt: `2026-09-0${id}T04:17:00.000Z`,
    status: "ok",
    trigger: "manual",
    ref,
    totals: {},
  });

  it("називає коміт, спільний для всіх зрізів", () => {
    expect(sameRef([point(1, "abc"), point(2, "abc")])).toBe("abc");
  });

  it("молчить, коли хоч один зріз знято на іншому коміті", () => {
    expect(sameRef([point(1, "abc"), point(2, "def")])).toBeNull();
  });

  it("молчить, коли коміт хоч одного зрізу невідомий", () => {
    expect(sameRef([point(1, "abc"), point(2, null)])).toBeNull();
  });

  it("одного зрізу замало для висновку", () => {
    expect(sameRef([point(1, "abc")])).toBeNull();
  });
});
