/**
 * Числа й слова «Мого дня» — окремо від розмітки, щоб правила («серія живе,
 * поки не порожньо», «порожній тиждень не малює стовпчиків») перевірялись без
 * браузера. Обране на день — це `priority` мірки, а не нова таблиця.
 *
 * @module web-platform-dev/src/pages/day/day-rhythm
 */

import { addTrackerDays } from "@wwwuabot/shared/trackers";

/** Кирилицею, як усе в продукті: `Intl` дає саме ту форму, яку читає людина. */
const WEEKDAY = new Intl.DateTimeFormat("uk-UA", { weekday: "long" });
const DATE = new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" });

/** Привітання за годиною — те, що людина чує від знайомого, а не «Вітаємо». */
export function greeting(hour: number): string {
  if (hour < 4) return "Доброї ночі";
  if (hour < 12) return "Доброго ранку";
  if (hour < 18) return "Доброго дня";
  return "Доброго вечора";
}

/** Шапка дня: «середа» й «17 листопада» — з першої літери великі. */
export function dayHeadline(now: Date): { weekday: string; date: string } {
  const upper = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
  return { weekday: upper(WEEKDAY.format(now)), date: DATE.format(now) };
}

/** «14 днів», «1 день», «3 дні» — множина, а не «днів» на одиниці. */
export function daysLabel(count: number): string {
  const ten = count % 10;
  const hundred = count % 100;
  if (ten === 1 && hundred !== 11) return `${count} день`;
  if (ten >= 2 && ten <= 4 && (hundred < 12 || hundred > 14)) return `${count} дні`;
  return `${count} днів`;
}

export interface DayRhythm {
  /** Днів поспіль із хоч одним записом; 0 — сьогодні й учора порожньо. */
  streak: number;
  /** Висоти стовпчиків останніх днів: 0…1, де 1 — найповніший день. */
  bars: number[];
  /** Скільки записів зроблено сьогодні — те, що показує плитка. */
  today: number;
}

/**
 * Ритм тижня. Серія живе, поки не порожньо: порожній сьогоднішній день її не
 * обриває (інакше щоранку було б «0 днів»), а порожній тиждень дає рівні
 * стовпчики — нуль записів це нуль, а не «майже».
 */
export function dayRhythm(entries: readonly { day: string }[], today: string, days = 7): DayRhythm {
  const perDay = new Map<string, number>();
  for (const entry of entries) perDay.set(entry.day, (perDay.get(entry.day) ?? 0) + 1);

  const window = Array.from({ length: days }, (_, index) =>
    addTrackerDays(today, index - (days - 1)),
  );
  const counts = window.map((day) => perDay.get(day) ?? 0);
  const peak = Math.max(...counts);
  const todayCount = perDay.get(today) ?? 0;

  let cursor = todayCount > 0 ? 0 : 1;
  let streak = 0;
  while ((perDay.get(addTrackerDays(today, -cursor)) ?? 0) > 0) {
    streak += 1;
    cursor += 1;
  }

  return {
    streak,
    today: todayCount,
    bars: counts.map((count) => (peak === 0 ? 0 : count / peak)),
  };
}

/**
 * Підпис під серією — той, що не бреше.
 *
 * Серія тримається за вчорашній день, поки сьогоднішній порожній, тож «і
 * сьогодні теж» можна писати лише тоді, коли сьогодні справді є запис.
 */
export function streakNote(rhythm: Pick<DayRhythm, "streak" | "today">): string {
  if (rhythm.streak === 0) return "щоденних записів ще немає";
  if (rhythm.today === 0) return "поспіль — сьогодні ще нічого";
  return "поспіль — і сьогодні теж";
}

/** Підпис під плиткою «справи»: порожній список — не «усе записано». */
export function waitingNote(chosen: number, waiting: number): string {
  if (chosen === 0) return "нічого не обрано";
  if (waiting === 0) return "усе записано";
  if (waiting === 1) return "1 чекає сьогодні";
  return `${waiting} чекають сьогодні`;
}

/** Мірки, які людина взяла на день: пріоритет 1–9, найвищий (1) — першим. */
export function dailyTrackers<T extends { id: number; priority?: number | null }>(
  trackers: readonly T[],
): T[] {
  return trackers
    .filter((tracker) => typeof tracker.priority === "number" && tracker.priority > 0)
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0) || a.id - b.id);
}
