import { describe, expect, it } from "vitest";
import {
  TRACKER_CATALOG,
  TRACKER_LIMITS,
  addTrackerDays,
  buildTrackerSeries,
  formatTrackerAmount,
  isWritableTrackerDay,
  isValidTrackerDay,
  todayTrackerDay,
  trackerDayTotals,
  trackerReport,
  trackerStreak,
  trackerValue,
  validateTrackerFields,
  type TrackerDayValue,
} from "./trackers";

function entry(day: string, value: number): TrackerDayValue {
  return { day, value };
}

describe("стандартні трекери", () => {
  it("ключі не повторюються, а ціль лежить у межах", () => {
    const keys = TRACKER_CATALOG.map((tracker) => tracker.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const tracker of TRACKER_CATALOG) {
      expect(tracker.title.length).toBeGreaterThan(0);
      expect(tracker.step).toBeGreaterThan(0);
      expect(tracker.max === null || tracker.max > tracker.min).toBe(true);
      if (tracker.goal !== null) {
        expect(tracker.goal).toBeGreaterThanOrEqual(tracker.min);
        expect(tracker.max === null || tracker.goal <= tracker.max).toBe(true);
      }
    }
  });
});

describe("дні", () => {
  it("приймає лише реальну дату без часу", () => {
    expect(isValidTrackerDay("2026-02-28")).toBe(true);
    expect(isValidTrackerDay("2026-02-31")).toBe(false);
    expect(isValidTrackerDay("2026-2-3")).toBe(false);
    expect(isValidTrackerDay("2026-02-28T10:00:00Z")).toBe(false);
  });

  it("зсув переходить через місяць і рік", () => {
    expect(addTrackerDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addTrackerDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addTrackerDays("2026-03-29", 1)).toBe("2026-03-30");
  });

  it("майбутнє записати не можна, а «завтра» приймаємо через часові зони", () => {
    const now = new Date("2026-05-10T12:00:00Z");
    const today = todayTrackerDay(now);
    expect(isWritableTrackerDay(today, now)).toBe(true);
    expect(isWritableTrackerDay(addTrackerDays(today, 1), now)).toBe(true);
    expect(isWritableTrackerDay(addTrackerDays(today, 2), now)).toBe(false);
  });
});

describe("форма власного трекера", () => {
  it("обрізає назву й одиницю та приймає порожню одиницю", () => {
    const result = validateTrackerFields({ title: "  Кава  ", unit: "чашок", step: 1 });
    expect(result).toEqual({
      ok: true,
      value: { title: "Кава", unit: "чашок", step: 1, goal: null, min: 0, max: null },
    });
  });

  it("⛔ порожня назва не створює трекер", () => {
    expect(validateTrackerFields({ title: "   ", step: 1 }).ok).toBe(false);
    expect(validateTrackerFields({ title: "x".repeat(TRACKER_LIMITS.title + 1), step: 1 }).ok).toBe(
      false,
    );
  });

  it("⛔ максимум мусить бути більшим за мінімум, ціль — у межах", () => {
    expect(validateTrackerFields({ title: "Вага", step: 0.1, min: 10, max: 5 }).ok).toBe(false);
    expect(validateTrackerFields({ title: "Вага", step: 0.1, min: 0, max: 5, goal: 8 }).ok).toBe(
      false,
    );
    expect(validateTrackerFields({ title: "Вага", step: 0, min: 0 }).ok).toBe(false);
  });
});

describe("значення", () => {
  it("поза межами трекера — відмова, а не обрізане число", () => {
    const mood = { min: 1, max: 5 };
    expect(trackerValue(4, mood)).toBe(4);
    expect(trackerValue(0, mood)).toBeNull();
    expect(trackerValue(6, mood)).toBeNull();
    expect(trackerValue(Number.NaN, mood)).toBeNull();
    expect(trackerValue("4", mood)).toBeNull();
  });
});

describe("суми дня", () => {
  it("⛔ два дотики одного дня — одна сума, а не два дні", () => {
    const totals = trackerDayTotals([entry("2026-05-10", 0.5), entry("2026-05-10", 1)]);
    expect(totals.get("2026-05-10")).toBe(1.5);

    const series = buildTrackerSeries(
      [entry("2026-05-10", 0.5), entry("2026-05-10", 1)],
      "2026-05-10",
      1,
    );
    expect(series).toEqual([{ day: "2026-05-10", value: 1.5 }]);
  });

  it("серія рахує суму дня, а не останній дотик", () => {
    const series = buildTrackerSeries(
      [entry("2026-05-10", 0.5), entry("2026-05-10", 1.5), entry("2026-05-09", 4)],
      "2026-05-10",
      2,
    );
    expect(series).toEqual([
      { day: "2026-05-09", value: 4 },
      { day: "2026-05-10", value: 2 },
    ]);
  });

  it("середнє вікна — по днях, а не по дотиках", () => {
    const report = trackerReport(
      [entry("2026-05-09", 4), entry("2026-05-10", 0.5), entry("2026-05-10", 1.5)],
      { endDay: "2026-05-10", days: 2, goal: null },
    );
    expect(report.average).toBe(3);
  });
});

describe("серія й звіт", () => {
  const entries = [entry("2026-05-08", 10), entry("2026-05-10", 20)];

  it("серія містить кожен день вікна — дірка лишається `null`", () => {
    const series = buildTrackerSeries(entries, "2026-05-10", 3);
    expect(series).toEqual([
      { day: "2026-05-08", value: 10 },
      { day: "2026-05-09", value: null },
      { day: "2026-05-10", value: 20 },
    ]);
  });

  it("серія з двох днів не тягне старші записи", () => {
    expect(buildTrackerSeries(entries, "2026-05-10", 2)).toEqual([
      { day: "2026-05-09", value: null },
      { day: "2026-05-10", value: 20 },
    ]);
  });

  it("⛔ серія рахується до останнього запису, а не до сьогодні", () => {
    expect(trackerStreak([entry("2026-05-08", 1), entry("2026-05-09", 1)], "2026-05-10")).toBe(2);
    expect(trackerStreak(entries, "2026-05-10")).toBe(1);
    expect(trackerStreak([], "2026-05-10")).toBe(0);
  });

  it("звіт рахує середнє, пік, серію й виконання цілі", () => {
    const report = trackerReport(entries, { endDay: "2026-05-10", days: 7, goal: 15 });
    expect(report.filled).toBe(2);
    expect(report.total).toBe(30);
    expect(report.average).toBe(15);
    expect(report.peak).toEqual({ day: "2026-05-10", value: 20 });
    expect(report.goalDays).toBe(1);
    expect(report.goalRate).toBeCloseTo(1 / 7, 5);
  });

  it("зміна — проти попереднього вікна тієї ж довжини", () => {
    const history = [
      entry("2026-05-01", 10),
      entry("2026-05-02", 10),
      entry("2026-05-04", 20),
      entry("2026-05-05", 20),
    ];
    const report = trackerReport(history, { endDay: "2026-05-05", days: 2, goal: null });
    expect(report.average).toBe(20);
    expect(report.changePct).toBe(100);
    expect(report.goalRate).toBeNull();
  });

  it("без попереднього вікна зміни немає — а не «нуль відсотків»", () => {
    const report = trackerReport([entry("2026-05-10", 20)], {
      endDay: "2026-05-10",
      days: 7,
      goal: null,
    });
    expect(report.changePct).toBeNull();
    expect(report.average).toBe(20);
  });

  it("значення з одиницею читається як мірка", () => {
    expect(formatTrackerAmount(2.5, "л")).toBe("2,5 л");
    expect(formatTrackerAmount(8000, "")).toMatch(/^8\s000$/);
  });
});
