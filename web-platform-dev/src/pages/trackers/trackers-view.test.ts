import { describe, expect, it } from "vitest";
import type { Tracker, TrackerEntryRow } from "@wwwuabot/shared/trackers";
import {
  amountOrDash,
  changeLabel,
  dayLabel,
  goalLabel,
  historySince,
  newestFirst,
  toTrackerRows,
} from "./trackers-view";

const tracker: Tracker = {
  id: 1,
  key: "water",
  title: "Вода",
  unit: "л",
  step: 0.25,
  goal: 2,
  min: 0,
  max: 20,
  icon: "droplet",
  isBuiltin: true,
};

const other: Tracker = { ...tracker, id: 2, key: "sleep", title: "Сон", unit: "год", goal: 8 };

function row(trackerId: number, day: string, value: number): TrackerEntryRow {
  return { trackerId, day, value, note: "" };
}

describe("рядки стрічки", () => {
  const entries = [row(1, "2026-10-16", 1.5), row(1, "2026-10-17", 2), row(2, "2026-10-15", 7)];

  it("⛔ день без запису — це `—`, а не нуль", () => {
    const [water, sleep] = toTrackerRows([tracker, other], entries, "2026-10-17");

    expect(water.today).toBe(2);
    expect(sleep.today).toBeNull();
    expect(amountOrDash(sleep.today, sleep.tracker.unit)).toBe("—");
  });

  it("серія — поточна: перерва вчора обнуляє її, а не тягне стару", () => {
    const [water, sleep] = toTrackerRows([tracker, other], entries, "2026-10-17");

    expect(water.streak).toBe(2);
    expect(sleep.streak).toBe(0);
    expect(sleep.lastDay).toBe("2026-10-15");
  });

  it("тиждень містить рівно сім днів, навіть коли записів один", () => {
    const [water] = toTrackerRows([tracker], entries, "2026-10-17");
    expect(water.series).toHaveLength(7);
    expect(water.series.filter((point) => point.value !== null)).toHaveLength(2);
  });

  it("записи одного трекера не потрапляють у сусідній", () => {
    const [water, sleep] = toTrackerRows([tracker, other], entries, "2026-10-17");
    expect(water.series.some((point) => point.value === 7)).toBe(false);
    expect(sleep.series.filter((point) => point.value !== null)).toHaveLength(1);
  });
});

describe("підписи", () => {
  it("історія — найновіше першим, без зміни вихідного списку", () => {
    const source = [
      { day: "2026-10-15", value: 1, note: "" },
      { day: "2026-10-17", value: 3, note: "" },
      { day: "2026-10-16", value: 2, note: "" },
    ];
    const sorted = newestFirst(source);

    expect(sorted.map((entry) => entry.day)).toEqual(["2026-10-17", "2026-10-16", "2026-10-15"]);
    expect(source[0].day).toBe("2026-10-15");
  });

  it("вікно бере запас на попередній період — інакше зміни не з чим порівняти", () => {
    expect(historySince("2026-10-17", 7)).toBe("2026-10-04");
  });

  it("день у списку — короткий, без року", () => {
    expect(dayLabel("2026-10-05")).toBe("05.10");
  });

  it("ціль показуємо лише тоді, коли вона є", () => {
    expect(goalLabel(tracker)).toBe("ціль 2 л");
    expect(goalLabel({ ...tracker, goal: null })).toBeNull();
  });

  it("зміна — словами, а не стрілкою: «більше» не завжди добре", () => {
    expect(changeLabel(null)).toBeNull();
    expect(changeLabel(0.4)).toBe("Як у попередній період");
    expect(changeLabel(12.4)).toBe("Більше на 12,4%");
    expect(changeLabel(-8)).toBe("Менше на 8%");
  });
});
