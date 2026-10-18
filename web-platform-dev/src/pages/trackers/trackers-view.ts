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
    .map(({ id, day, value, note, loggedAt }) => ({ id, day, value, note, loggedAt }));
}

/** Рядок списку: сума сьогоднішнього дня, серія й «чи записано сьогодні». */
export function toTrackerRows(
  trackers: readonly Tracker[],
  entries: readonly TrackerEntryRow[],
  endDay: string,
): TrackerRowView[] {
  return trackers.map((tracker) => {
    const own = entriesOf(entries, tracker.id);
    // Записаний нуль — це нуль, а не «не записано»: межа, яку легко злити.
    const todayValues = own.filter((entry) => entry.day === endDay);
    const todaySum = todayValues.reduce((sum, entry) => sum + entry.value, 0);
    const last = own.reduce<string | null>(
      (latest, entry) => (latest === null || entry.day > latest ? entry.day : latest),
      null,
    );
    return {
      tracker,
      today: todayValues.length === 0 ? null : Math.round(todaySum * 1000) / 1000,
      series: buildTrackerSeries(own, endDay, 7),
      streak: trackerStreak(own, endDay),
      lastDay: last,
    };
  });
}

/**
 * Історія — найновіше першим: за день може бути кілька дотиків, тож порядок
 * дає день, у межах дня — момент запису, а в межах секунди — номер рядка.
 */
export function newestFirst(entries: readonly TrackerEntry[]): TrackerEntry[] {
  return [...entries].sort((a, b) => {
    const left = `${a.day} ${a.loggedAt ?? ""} ${String(a.id).padStart(9, "0")}`;
    const right = `${b.day} ${b.loggedAt ?? ""} ${String(b.id).padStart(9, "0")}`;
    return left < right ? 1 : left > right ? -1 : 0;
  });
}

/** Час дотика з моменту запису: «13:45»; без часу — порожньо. */
export function timeLabel(loggedAt: string | null): string {
  const time = (loggedAt ?? "").slice(11, 16);
  return /^\d{2}:\d{2}$/.test(time) ? time : "";
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
