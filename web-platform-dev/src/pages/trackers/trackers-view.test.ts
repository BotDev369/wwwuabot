import { describe, expect, it } from "vitest";
import type { Tracker, TrackerEntry, TrackerEntryRow } from "@wwwuabot/shared/trackers";
import {
  amountOrDash,
  changeLabel,
  dayLabel,
  goalLabel,
  historySince,
  newestFirst,
  rowStatus,
  timeLabel,
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
  return {
    id: trackerId * 100 + day.length,
    trackerId,
    day,
    value,
    note: "",
    loggedAt: `${day} 09:00:00`,
  };
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

  it("⛔ два дотики одного дня — сума в рядку, а не два числа", () => {
    const twice = [row(1, "2026-10-17", 1), { ...row(1, "2026-10-17", 1), id: 2, value: 1 }];
    const [water] = toTrackerRows([tracker], twice, "2026-10-17");

    expect(water.today).toBe(2);
    expect(water.series[water.series.length - 1]).toEqual({ day: "2026-10-17", value: 2 });
  });

  it("підпис рядка — стан дня: сума після запису, ціль до нього", () => {
    const [water, sleep] = toTrackerRows([tracker, other], entries, "2026-10-17");

    expect(rowStatus(water)).toBe("2 л");
    expect(rowStatus(sleep)).toBe("ціль 8 год");
    expect(rowStatus(toTrackerRows([{ ...tracker, goal: null }], [], "2026-10-17")[0])).toBe(
      "без цілі",
    );
  });

  it("записаний нуль — це нуль, а не «не записано»", () => {
    const zeroed = [row(1, "2026-10-17", 0)];
    const [water] = toTrackerRows([tracker], zeroed, "2026-10-17");

    expect(water.today).toBe(0);
    expect(amountOrDash(water.today, water.tracker.unit)).toBe("0 л");
  });
});

describe("підписи", () => {
  it("історія — найновіше першим, у межах дня — за часом", () => {
    const source: TrackerEntry[] = [
      { id: 1, day: "2026-10-17", value: 1, note: "", loggedAt: "2026-10-17 09:00:00" },
      { id: 2, day: "2026-10-17", value: 3, note: "", loggedAt: "2026-10-17 21:00:00" },
      { id: 3, day: "2026-10-16", value: 2, note: "", loggedAt: "2026-10-16 12:00:00" },
    ];
    const sorted = newestFirst(source);

    expect(sorted.map((entry) => entry.id)).toEqual([2, 1, 3]);
    expect(source[0].id).toBe(1);
  });

  it("два дотики в одну секунду — новіший номер все одно вище", () => {
    const sameSecond: TrackerEntry[] = [
      { id: 4, day: "2026-10-17", value: 1, note: "", loggedAt: "2026-10-17 21:00:00" },
      { id: 9, day: "2026-10-17", value: 2, note: "", loggedAt: "2026-10-17 21:00:00" },
    ];

    expect(newestFirst(sameSecond).map((entry) => entry.id)).toEqual([9, 4]);
  });

  it("час дотика — з моменту запису, без нього — порожньо", () => {
    expect(timeLabel("2026-10-17 09:05:00")).toBe("09:05");
    expect(timeLabel(null)).toBe("");
    expect(timeLabel("17.10")).toBe("");
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
