/**
 * Вигляд трекерів — чисті функції: як назвати стан рядка, зсув виміру й момент
 * запису. День тут — не сутність, а підпис: «сьогодні», «вчора», «05.10».
 * Мірка режиму `read` показує **останній запис** із його датою.
 *
 * @module web-platform-dev/src/pages/trackers/trackers-view
 */

import {
  addTrackerDays,
  compareTrackerEntries,
  formatTrackerAmount,
  trackerLatest,
  trackerMode,
  type Tracker,
  type TrackerEntry,
  type TrackerEntryRow,
  type TrackerMode,
} from "@wwwuabot/shared/trackers";

export interface TrackerRowView {
  tracker: Tracker;
  mode: TrackerMode;
  /** Чи є запис за сьогодні — питання до обох видів, а не лише до денної суми. */
  recordedToday: boolean;
  /** Сума сьогоднішніх записів (режим `sum`); `null` — сьогодні запису немає. */
  today: number | null;
  /** Останній запис — те, що мірка режиму `read` показує замість суми дня. */
  latest: TrackerEntry | null;
}

/** Записи одного трекера — без `trackerId`, який рядку вже не потрібен. */
export function entriesOf(entries: readonly TrackerEntryRow[], trackerId: number): TrackerEntry[] {
  return entries
    .filter((entry) => entry.trackerId === trackerId)
    .map(({ id, day, value, note, loggedAt }) => ({ id, day, value, note, loggedAt }));
}

/** Рядок стрічки: режим, сума дня (для `sum`) і останній запис (для `read`). */
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
    const mode = trackerMode(tracker);
    return {
      tracker,
      mode,
      recordedToday: todayValues.length > 0,
      // Суми дня для вимірювальної мірки немає навмисно: два зважування по
      // 80 кг — не «160 кг сьогодні», а два виміри, і сума їх брехня.
      today: mode !== "sum" || todayValues.length === 0 ? null : Math.round(todaySum * 1000) / 1000,
      latest: trackerLatest(own),
    };
  });
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

/**
 * Підпис рядка стрічки: накопичувальна мірка — суму дня, вимірювальна — останній
 * запис із його датою. Одна формула на два режими була би брехнею: «7 кг» і
 * «7 кг сьогодні» — різні твердження, і друге з них неправдиве.
 */
export function rowStatus(row: TrackerRowView, endDay: string): string {
  if (row.mode === "sum") {
    if (row.today !== null) return formatTrackerAmount(row.today, row.tracker.unit);
    return goalLabel(row.tracker) ?? "немає записів";
  }
  if (!row.latest) return goalLabel(row.tracker) ?? "немає записів";
  return `${formatTrackerAmount(row.latest.value, row.tracker.unit)} · ${whenLabel(row.latest.day, endDay)}`;
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
