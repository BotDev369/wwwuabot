/**
 * Вигляд трекерів — чисті функції: тематика рядка, зсув виміру й момент
 * запису. День тут — не сутність, а підпис: «сьогодні», «вчора», «05.10».
 *
 * @module web-platform-dev/src/pages/trackers/trackers-view
 */

import {
  addTrackerDays,
  compareTrackerEntries,
  formatTrackerAmount,
  TRACKER_GROUPS,
  TRACKER_OWN_GROUP,
  trackerGroup,
  type Tracker,
  type TrackerEntry,
  type TrackerEntryRow,
} from "@wwwuabot/shared/trackers";

export interface TrackerRowView {
  tracker: Tracker;
  /** Чи є запис за сьогодні — смуга дня рахує мірки, а не рядки. */
  recordedToday: boolean;
}

/** Записи одного трекера — без `trackerId`, який рядку вже не потрібен. */
export function entriesOf(entries: readonly TrackerEntryRow[], trackerId: number): TrackerEntry[] {
  return entries
    .filter((entry) => entry.trackerId === trackerId)
    .map(({ id, day, value, note, loggedAt }) => ({ id, day, value, note, loggedAt }));
}

/** Рядок стрічки: чи записана мірка сьогодні. */
export function toTrackerRows(
  trackers: readonly Tracker[],
  entries: readonly TrackerEntryRow[],
  endDay: string,
): TrackerRowView[] {
  return trackers.map((tracker) => {
    const own = entriesOf(entries, tracker.id);
    // Записаний нуль — це нуль, а не «не записано»: межа, яку легко злити.
    const recordedToday = own.some((entry) => entry.day === endDay);
    return { tracker, recordedToday };
  });
}

export interface TrackerGroupView {
  title: string;
  rows: TrackerRowView[];
}

/**
 * Стрічка тематиками: порядок груп — з каталогу, «Свої» завжди останні,
 * порожні групи не показуємо — порожня полиця це шум, а не структура.
 */
export function groupTrackerRows(rows: readonly TrackerRowView[]): TrackerGroupView[] {
  const byGroup = new Map<string, TrackerRowView[]>();
  for (const row of rows) {
    const title = trackerGroup(row.tracker);
    const bucket = byGroup.get(title);
    if (bucket) bucket.push(row);
    else byGroup.set(title, [row]);
  }
  return [...TRACKER_GROUPS, TRACKER_OWN_GROUP]
    .filter((title) => byGroup.has(title))
    .map((title) => ({ title, rows: byGroup.get(title) ?? [] }));
}

/**
 * Історія — найновіше першим. Порядок дає спільний `compareTrackerEntries`:
 * день, момент запису, номер рядка — щоб два записи в одну секунду не мінялися
 * місцями (той самий порядок, що в `useTracker`).
 */
export function newestFirst(entries: readonly TrackerEntry[]): TrackerEntry[] {
  return [...entries].sort((a, b) => compareTrackerEntries(b, a));
}

/** Час запису «13:45»; без часу — порожньо. */
export function timeLabel(loggedAt: string | null): string {
  const time = (loggedAt ?? "").slice(11, 16);
  return /^\d{2}:\d{2}$/.test(time) ? time : "";
}

/** «10.05» — схема дати, за якою людина шукає рядок в історії. */
export function dayLabel(day: string): string {
  const [, month, date] = day.split("-");
  return `${date}.${month}`;
}

/** Коли був запис: «сьогодні», «вчора», далі — дата. */
export function whenLabel(day: string, endDay: string): string {
  if (day === endDay) return "сьогодні";
  if (day === addTrackerDays(endDay, -1)) return "вчора";
  return dayLabel(day);
}

export function amountOrDash(value: number | null, unit: string): string {
  return value === null ? "—" : formatTrackerAmount(value, unit);
}

/** Підпис цілі: «ціль 8 год» або порожньо — без цілі нема чого досягати. */
export function goalLabel(tracker: Tracker): string | null {
  if (tracker.goal === null) return null;
  return `ціль ${formatTrackerAmount(tracker.goal, tracker.unit)}`;
}

export interface ChartBand {
  min: number;
  max: number;
}

/**
 * Діапазон для **лінії** вимірів: не від нуля, а навколо самих значень.
 *
 * Стовпчик від нуля для ваги 78–79 кг — пласка лінія на всю висоту, тобто
 * графік, що нічого не показує. Ціль входить у діапазон: відстань до неї —
 * те, заради чого на неї дивляться.
 */
export function readingBand(values: readonly number[], goal: number | null): ChartBand {
  const numbers = goal === null ? [...values] : [...values, goal];
  if (numbers.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const pad = max > min ? (max - min) * 0.12 : Math.max(Math.abs(max) * 0.1, 0.5);
  return { min: min - pad, max: max + pad };
}

/** Зсув зі знаком: «−0,5 кг», «+1,5 год» — знак і є відповіддю «вгору чи вниз». */
export function signedAmount(value: number, unit: string): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${formatTrackerAmount(Math.abs(value), unit)}`;
}

/** Зсув виміру за вікно словами: «−0,5 кг за 30 дн.» */
export function changeAmountLabel(
  change: number | null,
  unit: string,
  days: number,
): string | null {
  if (change === null) return null;
  if (change === 0) return `Без змін за ${days} дн.`;
  return `${signedAmount(change, unit)} за ${days} дн.`;
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

/** Вікно для запиту: запас на попередній період дає «краще/гірше». */
export function historySince(endDay: string, days: number): string {
  return addTrackerDays(endDay, -(days * 2 - 1));
}
