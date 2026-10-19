import { describe, expect, it } from "vitest";
import type { Tracker, TrackerEntry, TrackerEntryRow } from "@wwwuabot/shared/trackers";
import {
  amountOrDash,
  changeAmountLabel,
  changeLabel,
  dayLabel,
  goalLabel,
  historySince,
  newestFirst,
  readingBand,
  rowStatus,
  signedAmount,
  timeLabel,
  toTrackerRows,
  whenLabel,
} from "./trackers-view";

const water: Tracker = {
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
  mode: "sum",
};

const weight: Tracker = {
  id: 2,
  key: "own-weight",
  title: "Вага",
  unit: "кг",
  step: 0.1,
  goal: null,
  min: 0,
  max: 400,
  icon: "bar-chart",
  isBuiltin: false,
  mode: "read",
};

function row(trackerId: number, day: string, value: number, time = "09:00"): TrackerEntryRow {
  return {
    id: trackerId * 100 + day.length + value,
    trackerId,
    day,
    value,
    note: "",
    loggedAt: `${day} ${time}:00`,
  };
}

describe("рядки стрічки", () => {
  const entries = [row(1, "2026-10-16", 1.5), row(1, "2026-10-17", 2), row(2, "2026-10-15", 7)];

  it("⛔ день без запису — це `—`, а не нуль", () => {
    const [sum, read] = toTrackerRows([water, weight], entries, "2026-10-17");

    expect(sum.today).toBe(2);
    expect(sum.recordedToday).toBe(true);
    expect(read.today).toBeNull();
    expect(read.recordedToday).toBe(false);
    expect(amountOrDash(read.today, read.tracker.unit)).toBe("—");
  });

  it("⛔ вимірювальна мірка веде останнім виміром, а не сумою дня", () => {
    const twice = [
      row(2, "2026-10-17", 80, "07:51"),
      { ...row(2, "2026-10-17", 79.5, "21:00"), id: 77 },
    ];
    const [read] = toTrackerRows([weight], twice, "2026-10-17");

    expect(read.latest?.value).toBe(79.5);
    // Сума двох зважувань — 159,5 кг: число, яке не існує в реальності.
    expect(read.today).toBeNull();
    expect(rowStatus(read, "2026-10-17")).toBe("79,5 кг · сьогодні");
  });

  it("⛔ два дотики одного дня — сума в рядку, а не два числа", () => {
    const twice = [row(1, "2026-10-17", 1), { ...row(1, "2026-10-17", 1), id: 2, value: 1 }];
    const [sum] = toTrackerRows([water], twice, "2026-10-17");

    expect(sum.today).toBe(2);
  });

  it("підпис рядка — стан мірки: сума дня для `sum`, останній вимір для `read`", () => {
    const [sum, read] = toTrackerRows([water, weight], entries, "2026-10-17");

    expect(rowStatus(sum, "2026-10-17")).toBe("2 л");
    expect(rowStatus(read, "2026-10-17")).toBe("7 кг · 15.10");
    expect(
      rowStatus(toTrackerRows([{ ...water, goal: null }], [], "2026-10-17")[0], "2026-10-17"),
    ).toBe("немає записів");
  });

  it("записаний нуль — це нуль, а не «не записано»", () => {
    const zeroed = [row(1, "2026-10-17", 0)];
    const [sum] = toTrackerRows([water], zeroed, "2026-10-17");

    expect(sum.today).toBe(0);
    expect(sum.recordedToday).toBe(true);
    expect(amountOrDash(sum.today, sum.tracker.unit)).toBe("0 л");
  });

  it("записи одного трекера не потрапляють у сусідній", () => {
    const [sum, read] = toTrackerRows([water, weight], entries, "2026-10-17");
    expect(sum.latest?.value).toBe(2);
    expect(read.latest?.value).toBe(7);
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

  it("дата запису — «сьогодні» / «вчора» / коротка дата", () => {
    expect(whenLabel("2026-10-17", "2026-10-17")).toBe("сьогодні");
    expect(whenLabel("2026-10-16", "2026-10-17")).toBe("вчора");
    expect(whenLabel("2026-10-05", "2026-10-17")).toBe("05.10");
  });

  it("вікно бере запас на попередній період — інакше зміни не з чим порівняти", () => {
    expect(historySince("2026-10-17", 7)).toBe("2026-10-04");
  });

  it("день у списку — короткий, без року", () => {
    expect(dayLabel("2026-10-05")).toBe("05.10");
  });

  it("ціль показуємо лише тоді, коли вона є", () => {
    expect(goalLabel(water)).toBe("ціль 2 л");
    expect(goalLabel({ ...water, goal: null })).toBeNull();
  });

  it("зсув — зі знаком, бо без нього «0,5 кг» не каже напрямку", () => {
    expect(signedAmount(-0.5, "кг")).toBe("−0,5 кг");
    expect(signedAmount(1.5, "год")).toBe("+1,5 год");
    expect(signedAmount(0, "бал")).toBe("0 бал");
    expect(changeAmountLabel(null, "кг", 30)).toBeNull();
    expect(changeAmountLabel(0, "кг", 30)).toBe("Без змін за 30 дн.");
    expect(changeAmountLabel(-0.5, "кг", 30)).toBe("−0,5 кг за 30 дн.");
  });

  it("зміна — словами, а не стрілкою: «більше» не завжди добре", () => {
    expect(changeLabel(null)).toBeNull();
    expect(changeLabel(0.4)).toBe("Як у попередній період");
    expect(changeLabel(12.4)).toBe("Більше на 12,4%");
    expect(changeLabel(-8)).toBe("Менше на 8%");
  });

  it("діапазон лінії — навколо значень, а не від нуля", () => {
    const band = readingBand([78, 79.5], null);

    expect(band.min).toBeLessThan(78);
    expect(band.max).toBeGreaterThan(79.5);
    // Вага з ціллю: ціль входить у діапазон — відстань до неї і є сенс графіка.
    expect(readingBand([79], 60).min).toBeLessThanOrEqual(60);
    expect(readingBand([], null)).toEqual({ min: 0, max: 1 });
  });
});
