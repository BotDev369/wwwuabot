import { describe, expect, it } from "vitest";
import {
  trackerHourBuckets,
  trackerMinuteBuckets,
  trackerMonthBuckets,
  trackerMonthDayBuckets,
  trackerRangeBuckets,
  trackerWeekBuckets,
  trackerYearBuckets,
  type TrackerBucketOptions,
} from "./buckets";
import type { TrackerEntry } from "../trackers";

const sum: TrackerBucketOptions = { mode: "sum", valueType: "number" };
const read: TrackerBucketOptions = { mode: "read", valueType: "number" };
const status: TrackerBucketOptions = { mode: "read", valueType: "boolean" };

function entry(day: string, value: number, time = "12:00"): TrackerEntry {
  return { id: 1, day, value, note: "", loggedAt: `${day} ${time}:00` };
}

describe("колонки років", () => {
  it("сума року складає всі записи року", () => {
    const buckets = trackerYearBuckets(
      [entry("2026-01-05", 1), entry("2026-12-31", 2), entry("2025-07-01", 4)],
      "2026-10-17",
      sum,
    );

    expect(buckets.map((bucket) => [bucket.label, bucket.value])).toEqual([
      ["2025", 4],
      ["2026", 3],
    ]);
  });

  it("рік без записів стоїть колонкою, а не зникає", () => {
    const buckets = trackerYearBuckets(
      [entry("2024-05-05", 1), entry("2026-05-05", 1)],
      "2026-10-17",
      sum,
    );
    expect(buckets.map((bucket) => bucket.label)).toEqual(["2024", "2025", "2026"]);
    expect(buckets[1].value).toBeNull();
  });

  it("вимір року — останній вимір, а не сума", () => {
    const buckets = trackerYearBuckets(
      [entry("2026-01-02", 78), entry("2026-06-02", 81)],
      "2026-10-17",
      read,
    );
    expect(buckets[0].value).toBe(81);
  });

  it("«так-ні» лічиться днями навіть у режимі виміру", () => {
    const buckets = trackerYearBuckets(
      [entry("2026-01-02", 1), entry("2026-01-03", 1), entry("2026-01-04", 0)],
      "2026-10-17",
      status,
    );
    expect(buckets[0].value).toBe(2);
  });

  it("без записів лишається рік поточного дня — порожній, а не діра", () => {
    const buckets = trackerYearBuckets([], "2026-10-17", sum);
    expect(buckets).toEqual([{ key: "2026", label: "2026", value: null }]);
  });
});

describe("колонки місяців і днів", () => {
  it("помісячно — 12 колонок року, порожні лишаються `null`", () => {
    const buckets = trackerMonthBuckets(
      [entry("2026-03-04", 2), entry("2026-03-05", 3)],
      "2026-10-17",
      sum,
    );

    expect(buckets).toHaveLength(12);
    expect(buckets[0].label).toBe("Січ");
    expect(buckets[11].label).toBe("Гру");
    expect(buckets[2].value).toBe(5);
    expect(buckets[1].value).toBeNull();
  });

  it("поточний місяць — стільки колонок, скільки днів у місяці", () => {
    const buckets = trackerMonthDayBuckets([entry("2026-02-10", 7)], "2026-02-14", sum);
    expect(buckets).toHaveLength(28);
    expect(buckets[9]).toEqual({ key: "2026-02-10", label: "10", value: 7 });
  });

  it("тиждень — понеділок перший, навіть коли день у неділю", () => {
    const buckets = trackerWeekBuckets([entry("2026-10-18", 3)], "2026-10-18", sum);
    expect(buckets.map((bucket) => bucket.label)).toEqual([
      "Пн",
      "Вт",
      "Ср",
      "Чт",
      "Пт",
      "Сб",
      "Нд",
    ]);
    expect(buckets[0].key).toBe("2026-10-12");
    expect(buckets[6].value).toBe(3);
  });

  it("години дня — 24 колонки, запис лягає у свою годину", () => {
    const buckets = trackerHourBuckets([entry("2026-10-17", 2, "14:30")], "2026-10-17", sum);
    expect(buckets).toHaveLength(24);
    expect(buckets[14].value).toBe(2);
    expect(buckets[13].value).toBeNull();
  });
});

describe("колонки хвилин", () => {
  it("15 хв — п'ятнадцять колонок по хвилині назад від моменту", () => {
    const buckets = trackerMinuteBuckets(
      [entry("2026-10-17", 1, "14:59"), entry("2026-10-17", 1, "14:45")],
      "2026-10-17 15:00:20",
      { ...sum, size: 1, count: 15 },
    );

    expect(buckets).toHaveLength(15);
    expect(buckets[0].label).toBe("14:46");
    expect(buckets[13].label).toBe("14:59");
    expect(buckets[13].value).toBe(1);
    // Запис поза вікном (14:45) не потрапляє в жодну колонку.
    expect(buckets.filter((bucket) => bucket.value !== null)).toHaveLength(1);
    expect(buckets[0].value).toBeNull();
  });

  it("година — колонка на п'ять хвилин", () => {
    const buckets = trackerMinuteBuckets([entry("2026-10-17", 2, "15:03")], "2026-10-17 15:04:00", {
      ...sum,
      size: 5,
      count: 12,
    });

    expect(buckets).toHaveLength(12);
    expect(buckets[11].label).toBe("15:00");
    expect(buckets[11].value).toBe(2);
  });
});

describe("довільний проміжок", () => {
  it("короткий проміжок — колонка-день", () => {
    const buckets = trackerRangeBuckets([entry("2026-10-05", 4)], "2026-10-05", "2026-10-07", sum);
    expect(buckets.map((bucket) => bucket.label)).toEqual(["05.10", "06", "07"]);
    expect(buckets[0].value).toBe(4);
  });

  it("перевернуті дати читаються як той самий проміжок", () => {
    const buckets = trackerRangeBuckets([], "2026-10-07", "2026-10-05", sum);
    expect(buckets.map((bucket) => bucket.key)).toEqual(["2026-10-05", "2026-10-06", "2026-10-07"]);
  });

  it("довгий проміжок — колонки місяців", () => {
    const buckets = trackerRangeBuckets(
      [entry("2026-01-20", 2), entry("2026-03-02", 3)],
      "2026-01-10",
      "2026-03-10",
      sum,
    );
    expect(buckets.map((bucket) => bucket.label)).toEqual(["Січ", "Лют", "Бер"]);
    expect(buckets.map((bucket) => bucket.value)).toEqual([2, null, 3]);
  });
});
