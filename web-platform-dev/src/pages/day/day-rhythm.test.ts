/**
 * Арифметика «Мого дня» без браузера: серія, стовпчики тижня, вибір мірок і
 * підписи.
 *
 * Ламається мовчки: серія, порахована від сьогодні, показує «0 днів» щоранку;
 * підпис, що не знає про порожній сьогоднішній день, обіцяє запис, якого
 * немає. Обидва випадки — правило, а не вигляд.
 *
 * @module web-platform-dev/src/pages/day/day-rhythm.test
 */

import { describe, expect, it } from "vitest";
import {
  dailyTrackers,
  dayHeadline,
  dayRhythm,
  daysLabel,
  greeting,
  streakNote,
  waitingNote,
} from "./day-rhythm";

describe("привітання й шапка дня", () => {
  it("привітання за годиною, а не одне на весь день", () => {
    expect(greeting(2)).toBe("Доброї ночі");
    expect(greeting(9)).toBe("Доброго ранку");
    expect(greeting(14)).toBe("Доброго дня");
    expect(greeting(21)).toBe("Доброго вечора");
  });

  it("шапка: день тижня й дата з великої літери", () => {
    expect(dayHeadline(new Date(2026, 10, 17, 9))).toEqual({
      weekday: "Вівторок",
      date: "17 листопада",
    });
  });
});

describe("множина днів", () => {
  it("одиниця, кілька й багато — різні слова", () => {
    expect(daysLabel(1)).toBe("1 день");
    expect(daysLabel(3)).toBe("3 дні");
    expect(daysLabel(5)).toBe("5 днів");
    expect(daysLabel(21)).toBe("21 день");
    expect(daysLabel(24)).toBe("24 дні");
    expect(daysLabel(11)).toBe("11 днів");
    expect(daysLabel(14)).toBe("14 днів");
  });
});

describe("ритм тижня", () => {
  it("серія живе, поки не порожньо: сьогодні без записів її не обриває", () => {
    const rhythm = dayRhythm(
      [{ day: "2026-11-16" }, { day: "2026-11-15" }, { day: "2026-11-14" }],
      "2026-11-17",
    );

    expect(rhythm.streak).toBe(3);
    expect(rhythm.today).toBe(0);
  });

  it("записи сьогодні додаються до серії й рахуються окремо", () => {
    const rhythm = dayRhythm(
      [{ day: "2026-11-17" }, { day: "2026-11-17" }, { day: "2026-11-16" }],
      "2026-11-17",
    );

    expect(rhythm.streak).toBe(2);
    expect(rhythm.today).toBe(2);
  });

  it("порожній тиждень — нуль, а не «майже»", () => {
    const rhythm = dayRhythm([], "2026-11-17");

    expect(rhythm.streak).toBe(0);
    expect(rhythm.today).toBe(0);
    expect(rhythm.bars).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("стовпчики: сім днів, останній — сьогодні, найповніший день — одиниця", () => {
    const rhythm = dayRhythm(
      [{ day: "2026-11-17" }, { day: "2026-11-16" }, { day: "2026-11-16" }],
      "2026-11-17",
    );

    expect(rhythm.bars).toHaveLength(7);
    expect(rhythm.bars[6]).toBe(0.5);
    expect(rhythm.bars[5]).toBe(1);
  });
});

describe("підписи не брешуть", () => {
  it("серія з учора не каже «і сьогодні теж»", () => {
    expect(streakNote({ streak: 3, today: 0 })).toBe("поспіль — сьогодні ще нічого");
    expect(streakNote({ streak: 3, today: 1 })).toBe("поспіль — і сьогодні теж");
    expect(streakNote({ streak: 0, today: 0 })).toBe("щоденних записів ще немає");
  });

  it("порожній вибір мірок — не «усе записано»", () => {
    expect(waitingNote(0, 0)).toBe("нічого не обрано");
    expect(waitingNote(3, 0)).toBe("усе записано");
    expect(waitingNote(3, 1)).toBe("1 чекає сьогодні");
    expect(waitingNote(3, 2)).toBe("2 чекають сьогодні");
  });
});

describe("обрані на день мірки", () => {
  it("беруться лише з пріоритетом, найвищий (1) — першим", () => {
    const picked = dailyTrackers([
      { id: 5, priority: 3 },
      { id: 2, priority: null },
      { id: 1, priority: 1 },
      { id: 3 },
      { id: 4, priority: 0 },
    ]);

    expect(picked.map((tracker) => tracker.id)).toEqual([1, 5]);
  });

  it("однаковий пріоритет — порядок за id, щоб список не стрибав", () => {
    const picked = dailyTrackers([
      { id: 9, priority: 2 },
      { id: 4, priority: 2 },
      { id: 7, priority: 1 },
    ]);

    expect(picked.map((tracker) => tracker.id)).toEqual([7, 4, 9]);
  });
});
