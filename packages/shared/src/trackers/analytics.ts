/**
 * Аналітика трекерів — чисті функції над записами: сума дня, серія, звіт вікна
 * і звіт вимірів. Модель (типи, каталог, валідація) — у `../trackers`; «дня»
 * як сутності тут немає — кошик дня будують `addTrackerDays`/`todayTrackerDay`.
 *
 * @module @wwwuabot/shared/trackers/analytics
 */

import {
  addTrackerDays,
  compareTrackerEntries,
  type Tracker,
  type TrackerDayValue,
  type TrackerEntry,
  type TrackerMode,
  type TrackerPoint,
  type TrackerReport,
} from "../trackers";

/**
 * Сума дня — для режиму `sum`: скільки разів людина не записала би мірку,
 * день лишається одним числом (вода, кроки, витрати).
 */
export function trackerDayTotals(entries: readonly TrackerDayValue[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    totals.set(entry.day, (totals.get(entry.day) ?? 0) + entry.value);
  }
  return totals;
}

/**
 * Останній вимір дня — для режиму `read`. Сумувати виміри не можна (два
 * настрої по 4 — не 8), тож день показує те, що виміряли останнім.
 */
function trackerDayLast(entries: readonly TrackerDayValue[]): Map<string, number> {
  const last = new Map<string, number>();
  for (const entry of [...entries].sort(compareTrackerEntries)) last.set(entry.day, entry.value);
  return last;
}

function sortedEntries(entries: readonly TrackerEntry[]): TrackerEntry[] {
  return [...entries].sort(compareTrackerEntries);
}

export interface TrackerReadingStats {
  count: number;
  average: number | null;
  min: TrackerEntry | null;
  max: TrackerEntry | null;
  /** Різниця «останній − перший» у вікні, в одиницях мірки; `null` — нема з чим порівнювати. */
  change: number | null;
}

/**
 * Звіт вимірів: те, що має сенс для `read` — середнє, межі й зсув за вікно.
 * Суми вимірів тут немає навмисно: вона нічого не означає.
 */
export function trackerReadingStats(entries: readonly TrackerEntry[]): TrackerReadingStats {
  const sorted = sortedEntries(entries);
  let min: TrackerEntry | null = null;
  let max: TrackerEntry | null = null;
  for (const entry of sorted) {
    if (!min || entry.value < min.value) min = entry;
    if (!max || entry.value > max.value) max = entry;
  }
  const total = sorted.reduce((sum, entry) => sum + entry.value, 0);
  const average = sorted.length ? Math.round((total / sorted.length) * 100) / 100 : null;
  const first = sorted[0]?.value ?? null;
  const last = sorted[sorted.length - 1]?.value ?? null;
  return {
    count: sorted.length,
    average,
    min,
    max,
    change:
      first === null || last === null || sorted.length < 2
        ? null
        : Math.round((last - first) * 1000) / 1000,
  };
}

/**
 * Серія за вікно: дні без запису стоять `null`, тож графік не зсуває історію.
 * `mode` вирішує, що робити з кількома записами одного дня — суму чи останній.
 */
export function buildTrackerSeries(
  entries: readonly TrackerDayValue[],
  endDay: string,
  days: number,
  mode: TrackerMode = "sum",
): TrackerPoint[] {
  const byDay = mode === "sum" ? trackerDayTotals(entries) : trackerDayLast(entries);
  const points: TrackerPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const day = addTrackerDays(endDay, -offset);
    const value = byDay.get(day);
    points.push({ day, value: value === undefined ? null : Math.round(value * 1000) / 1000 });
  }
  return points;
}

/**
 * Серія — до **останнього запису**, а не до сьогодні.
 *
 * Інакше людина, яка записала вчора, бачила б нуль: сьогоднішній день ще не
 * прожито, і «нема запису» не означає «нуль кроків».
 */
export function trackerStreak(entries: readonly TrackerDayValue[], endDay: string): number {
  const days = new Set(entries.map((entry) => entry.day));
  let cursor = days.has(endDay) ? endDay : addTrackerDays(endDay, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addTrackerDays(cursor, -1);
  }
  return streak;
}

/** Середнє вікна — по **днях із записом**, а не по окремих дотиках. */
function windowAverage(
  totals: ReadonlyMap<string, number>,
  from: string,
  to: string,
): number | null {
  const values: number[] = [];
  for (const [day, value] of totals) {
    if (day >= from && day <= to) values.push(value);
  }
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * Звіт за вікно; попереднє вікно тієї ж довжини дає «краще/гірше».
 * Рахує **дні, а не записи**: `mode` лише вирішує, як згорнути день.
 */
export function trackerReport(
  entries: readonly TrackerDayValue[],
  options: { endDay: string; days: number; goal: Tracker["goal"]; mode?: TrackerMode },
): TrackerReport {
  const { endDay, days, goal, mode = "sum" } = options;
  const series = buildTrackerSeries(entries, endDay, days, mode);
  const filled = series.filter(
    (point): point is { day: string; value: number } => point.value !== null,
  );
  const total = filled.reduce((sum, point) => sum + point.value, 0);
  const start = addTrackerDays(endDay, -(days - 1));

  let peak: TrackerDayValue | null = null;
  for (const point of filled) {
    if (!peak || point.value > peak.value) peak = { day: point.day, value: point.value };
  }

  const goalDays = goal === null ? 0 : filled.filter((point) => point.value >= goal).length;
  const previousTo = addTrackerDays(start, -1);
  const previousFrom = addTrackerDays(previousTo, -(days - 1));
  const current = filled.length ? total / filled.length : null;
  const previous = windowAverage(trackerDayTotals(entries), previousFrom, previousTo);
  const changePct =
    current !== null && previous !== null && previous > 0
      ? Math.round(((current - previous) / previous) * 1000) / 10
      : null;

  return {
    days,
    filled: filled.length,
    total: Math.round(total * 100) / 100,
    average: current === null ? null : Math.round(current * 100) / 100,
    peak,
    streak: trackerStreak(entries, endDay),
    goalDays,
    goalRate: goal === null || filled.length === 0 ? null : goalDays / days,
    changePct,
  };
}
