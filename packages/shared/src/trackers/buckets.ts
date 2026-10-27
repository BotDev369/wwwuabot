/**
 * Періоди аналітики: записи → колонки. Правило одне на всі мірки — `sum`
 * додає, `read` бере останній, «так-ні» додає завжди (1/0 — це лічба днів, а
 * не стан). Колонка без запису лишається `null`, а не нулем.
 *
 * @module @wwwuabot/shared/trackers/buckets
 */

import {
  addTrackerDays,
  compareTrackerEntries,
  type TrackerEntry,
  type TrackerMode,
  type TrackerValueType,
} from "../trackers";

/** Колонка графіка: період у шапці й значення під ним. */
export interface TrackerBucket {
  /** Ключ колонки — стабільний для React і для тестів. */
  key: string;
  /** Підпис шапки: «2026», «Бер», «8», «14:05». */
  label: string;
  value: number | null;
}

/** Що вирішує значення колонки — те саме, що читає картка трекера. */
export interface TrackerBucketOptions {
  mode: TrackerMode;
  valueType: TrackerValueType;
}

type Entry = Pick<TrackerEntry, "day" | "value" | "loggedAt">;

const MONTHS = [
  "Січ",
  "Лют",
  "Бер",
  "Кві",
  "Тра",
  "Чер",
  "Лип",
  "Сер",
  "Вер",
  "Жов",
  "Лис",
  "Гру",
] as const;

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"] as const;

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Значення колонки: «так-ні» лічимо завжди — стан року нічого не показує, а
 * кількість днів із «так» показує. Для чисел вирішує `mode` мірки.
 */
function bucketValue(entries: readonly Entry[], options: TrackerBucketOptions): number | null {
  if (entries.length === 0) return null;
  if (options.valueType === "boolean" || options.mode === "sum") {
    return round(entries.reduce((sum, entry) => sum + entry.value, 0));
  }
  const last = entries.reduce((a, b) => (compareTrackerEntries(a, b) <= 0 ? b : a));
  return round(last.value);
}

/** Один прохід по записах на весь графік: ключ колонки → її записи. */
function bucketsFrom(
  columns: readonly { key: string; label: string }[],
  entries: readonly Entry[],
  keyOf: (entry: Entry) => string,
  options: TrackerBucketOptions,
): TrackerBucket[] {
  const grouped = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = keyOf(entry);
    const bucket = grouped.get(key);
    if (bucket) bucket.push(entry);
    else grouped.set(key, [entry]);
  }
  return columns.map(({ key, label }) => ({
    key,
    label,
    value: bucketValue(grouped.get(key) ?? [], options),
  }));
}

/**
 * «Всього» — рік як колонка. Роки без записів між першим і останнім стоять
 * теж: дірка в часі читається як пропущений рядок, а не як «не користувався».
 */
export function trackerYearBuckets(
  entries: readonly Entry[],
  endDay: string,
  options: TrackerBucketOptions,
): TrackerBucket[] {
  const years = new Set<number>([Number(endDay.slice(0, 4))]);
  for (const entry of entries) years.add(Number(entry.day.slice(0, 4)));
  const valid = [...years].filter((year) => Number.isInteger(year) && year > 0);
  const from = Math.min(...valid);
  const to = Math.max(...valid);
  const columns = Array.from({ length: to - from + 1 }, (_, index) => {
    const year = from + index;
    return { key: String(year), label: String(year) };
  });
  return bucketsFrom(columns, entries, (entry) => entry.day.slice(0, 4), options);
}

/** «Помісячно» — 12 місяців року, у якому лежить `endDay`. */
export function trackerMonthBuckets(
  entries: readonly Entry[],
  endDay: string,
  options: TrackerBucketOptions,
): TrackerBucket[] {
  const year = endDay.slice(0, 4);
  const columns = MONTHS.map((label, index) => ({
    key: `${year}-${String(index + 1).padStart(2, "0")}`,
    label,
  }));
  return bucketsFrom(columns, entries, (entry) => entry.day.slice(0, 7), options);
}

/** «Поточний місяць» — дні місяця від першого до останнього. */
export function trackerMonthDayBuckets(
  entries: readonly Entry[],
  endDay: string,
  options: TrackerBucketOptions,
): TrackerBucket[] {
  const month = endDay.slice(0, 7);
  const last = new Date(`${month}-01T00:00:00Z`);
  last.setUTCMonth(last.getUTCMonth() + 1);
  last.setUTCDate(0);
  const columns = Array.from({ length: last.getUTCDate() }, (_, index) => {
    const day = `${month}-${String(index + 1).padStart(2, "0")}`;
    return { key: day, label: String(index + 1) };
  });
  return bucketsFrom(columns, entries, (entry) => entry.day, options);
}

/** «Тиждень» — календарний тиждень із понеділка, у якому лежить `endDay`. */
export function trackerWeekBuckets(
  entries: readonly Entry[],
  endDay: string,
  options: TrackerBucketOptions,
): TrackerBucket[] {
  const weekday = new Date(`${endDay}T00:00:00Z`).getUTCDay();
  const monday = addTrackerDays(endDay, -((weekday + 6) % 7));
  const columns = WEEKDAYS.map((label, index) => ({
    key: addTrackerDays(monday, index),
    label,
  }));
  return bucketsFrom(columns, entries, (entry) => entry.day, options);
}

/** «День» — 24 години дня `endDay`. */
export function trackerHourBuckets(
  entries: readonly Entry[],
  endDay: string,
  options: TrackerBucketOptions,
): TrackerBucket[] {
  const columns = Array.from({ length: 24 }, (_, hour) => ({
    key: String(hour),
    label: String(hour),
  }));
  const own = entries.filter((entry) => entry.day === endDay);
  return bucketsFrom(columns, own, (entry) => String(Math.floor(hourOf(entry) ?? 0)), options);
}

/** Хвилина від початку дня; без моменту запису — `null` (місце невідоме). */
function hourOf(entry: Entry): number | null {
  const time = (entry.loggedAt ?? "").slice(11, 13);
  return /^\d{2}$/.test(time) ? Number(time) : null;
}

/** Стінний час запису у мілісекундах — для вікон «остання година/15 хв». */
function wallClock(day: string, loggedAt: string | null): number | null {
  const time = (loggedAt ?? "").slice(11, 16);
  if (!/^\d{2}:\d{2}$/.test(time)) return null;
  const ms = Date.parse(`${day}T${time}:00Z`);
  return Number.isFinite(ms) ? ms : null;
}

function clockLabel(ms: number): string {
  const date = new Date(ms);
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

/**
 * Останні хвилини: `size` хвилин у колонці, `count` колонок назад від `endAt`
 * (`YYYY-MM-DD HH:MM:SS`). Годинник тут — пристрою: остання година не залежить
 * від того, коли сервер віддав історію.
 */
export function trackerMinuteBuckets(
  entries: readonly Entry[],
  endAt: string,
  options: TrackerBucketOptions & { size: number; count: number },
): TrackerBucket[] {
  const now = wallClock(endAt.slice(0, 10), endAt);
  if (now === null) return [];
  const step = options.size * 60_000;
  const edge = Math.floor(now / step) * step + step;
  const first = edge - options.count * step;
  const columns = Array.from({ length: options.count }, (_, index) => {
    const start = first + index * step;
    return { key: String(start), label: clockLabel(start) };
  });
  return bucketsFrom(
    columns,
    entries,
    (entry) => {
      const ms = wallClock(entry.day, entry.loggedAt);
      if (ms === null || ms < first || ms >= edge) return "";
      return String(Math.floor((ms - first) / step) * step + first);
    },
    options,
  );
}

/** Довільний проміжок: до 31 дня — колонка-день, далі — колонка-місяць. */
export function trackerRangeBuckets(
  entries: readonly Entry[],
  from: string,
  to: string,
  options: TrackerBucketOptions,
): TrackerBucket[] {
  const [start, end] = from <= to ? [from, to] : [to, from];
  const days = daySpan(start, end);
  if (days <= 31) {
    const columns = Array.from({ length: days }, (_, index) => {
      const day = addTrackerDays(start, index);
      const label =
        index === 0 || day.slice(8) === "01" ? `${day.slice(8)}.${day.slice(5, 7)}` : day.slice(8);
      return { key: day, label };
    });
    return bucketsFrom(columns, entries, (entry) => entry.day, options);
  }
  const months: { key: string; label: string }[] = [];
  let cursor = `${start.slice(0, 7)}-01`;
  const lastMonth = end.slice(0, 7);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  while (cursor.slice(0, 7) <= lastMonth) {
    const index = Number(cursor.slice(5, 7)) - 1;
    months.push({
      key: cursor.slice(0, 7),
      label: sameYear ? MONTHS[index] : `${MONTHS[index]} ${cursor.slice(2, 4)}`,
    });
    cursor = addTrackerDays(cursor, 32).slice(0, 7) + "-01";
  }
  return bucketsFrom(months, entries, (entry) => entry.day.slice(0, 7), options);
}

/** Днів у проміжку, включно з обома кінцями. */
function daySpan(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 0;
  return Math.round((end - start) / 86_400_000) + 1;
}
