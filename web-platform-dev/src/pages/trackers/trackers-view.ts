/**
 * Вигляд трекерів — чисті функції: що показати в рядку, як назвати серію й
 * зміну. Стан живе в хуках, розмітка — у сторінках, а правила тут (AGENTS.md §3).
 *
 * @module web-platform-dev/src/pages/trackers/trackers-view
 */

import {
  addTrackerDays,
  buildTrackerSeries,
  formatTrackerAmount,
  trackerStreak,
  type Tracker,
  type TrackerEntry,
  type TrackerEntryRow,
  type TrackerPoint,
} from "@wwwuabot/shared/trackers";

export interface TrackerRowView {
  tracker: Tracker;
  /** Значення за сьогодні; `null` — ще не записано (це не нуль). */
  today: number | null;
  series: TrackerPoint[];
  streak: number;
  lastDay: string | null;
}

export function entriesOf(entries: readonly TrackerEntryRow[], trackerId: number): TrackerEntry[] {
  return entries
    .filter((entry) => entry.trackerId === trackerId)
    .map(({ day, value, note }) => ({ day, value, note }));
}

/** Рядок списку: останні сім днів, серія й «чи є сьогодні». */
export function toTrackerRows(
  trackers: readonly Tracker[],
  entries: readonly TrackerEntryRow[],
  endDay: string,
): TrackerRowView[] {
  return trackers.map((tracker) => {
    const own = entriesOf(entries, tracker.id);
    const today = own.find((entry) => entry.day === endDay)?.value ?? null;
    const last = own.reduce<string | null>(
      (latest, entry) => (latest === null || entry.day > latest ? entry.day : latest),
      null,
    );
    return {
      tracker,
      today,
      series: buildTrackerSeries(own, endDay, 7),
      streak: trackerStreak(own, endDay),
      lastDay: last,
    };
  });
}

/** Історія — найновіше першим: правка вчорашнього дня стоїть поруч. */
export function newestFirst(entries: readonly TrackerEntry[]): TrackerEntry[] {
  return [...entries].sort((a, b) => (a.day < b.day ? 1 : a.day > b.day ? -1 : 0));
}

/** Вікно для запиту: запас на попередній період дає «краще/гірше». */
export function historySince(endDay: string, days: number): string {
  return addTrackerDays(endDay, -(days * 2 - 1));
}

/** «10.05» — схема дати, за якою людина шукає рядок в історії. */
export function dayLabel(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}.${month}`;
}

export function amountOrDash(value: number | null, unit: string): string {
  return value === null ? "—" : formatTrackerAmount(value, unit);
}

/** Підпис цілі: «ціль 8 год» або порожньо — без цілі нема чого досягати. */
export function goalLabel(tracker: Tracker): string | null {
  if (tracker.goal === null) return null;
  return `ціль ${formatTrackerAmount(tracker.goal, tracker.unit)}`;
}

/**
 * Зміна середнього — словами, а не знаком: стрілка вгору для витрат читалась
 * би як «добре», хоч це «більше». Тому кажемо просто «більше/менше».
 */
export function changeLabel(changePct: number | null): string | null {
  if (changePct === null) return null;
  if (Math.abs(changePct) < 1) return "Як у попередній період";
  const amount = Math.abs(changePct).toLocaleString("uk-UA", { maximumFractionDigits: 1 });
  return changePct > 0 ? `Більше на ${amount}%` : `Менше на ${amount}%`;
}
