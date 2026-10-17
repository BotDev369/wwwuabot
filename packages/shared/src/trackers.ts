/**
 * Трекери — один універсальний трекер: щоденне число з одиницею й ціллю.
 * Вид задають дані (`unit`/`step`/`goal`), а не гілка в коді; аналітика —
 * чисті функції, правила — `docs/TRACKERS.md`.
 *
 * @module @wwwuabot/shared/trackers
 */

import type { IconName } from "./components/icon-names";

/** Поля, які людина задає для будь-якого трекера. */
export interface TrackerFields {
  title: string;
  /** Порожня одиниця — теж одиниця: «3 рази», «5 балів» не потребують слова. */
  unit: string;
  /** Крок поля вводу; він же — одиниця округлення. */
  step: number;
  /** Ціль дня; `null` — цілі немає (вага, витрати). */
  goal: number | null;
  min: number;
  max: number | null;
}

/** Стандартний трекер: людина отримує його при першому вході. */
export interface TrackerCatalogEntry extends TrackerFields {
  key: string;
  icon: IconName;
}

/** Трекер людини: рядок `trackers` (ключ унікальний у межах власника). */
export interface Tracker extends TrackerFields {
  id: number;
  key: string;
  icon: IconName;
  isBuiltin: boolean;
}

/** Запис за день: один на трекер і день (рядок `tracker_entries`). */
export interface TrackerEntry {
  day: string;
  value: number;
  note: string;
}

/** Запис разом із трекером — стрічка читає всі дні одним запитом. */
export interface TrackerEntryRow extends TrackerEntry {
  trackerId: number;
}

/** Точка серії: день без запису лишається в серії як `null`, а не зникає. */
export interface TrackerPoint {
  day: string;
  value: number | null;
}

export interface TrackerReport {
  days: number;
  filled: number;
  total: number;
  average: number | null;
  peak: TrackerEntry | null;
  streak: number;
  goalDays: number;
  goalRate: number | null;
  /** Зміна середнього проти попереднього вікна, у відсотках; `null` — нема з чим порівнювати. */
  changePct: number | null;
}

/** Вікна аналітики, які пропонує екран. */
export const TRACKER_RANGES = [7, 30, 90] as const;
export type TrackerRange = (typeof TRACKER_RANGES)[number];

export function isTrackerRange(value: unknown): value is TrackerRange {
  return TRACKER_RANGES.includes(Number(value) as TrackerRange);
}

export const TRACKER_LIMITS = {
  title: 40,
  unit: 8,
  note: 200,
  trackers: 60,
  value: 1_000_000_000,
} as const;

/**
 * Стандартний набір — те, що людина бачить при першому вході.
 *
 * Це приклади одного механізму, а не закритий перелік: власний трекер
 * додають тим самим полем «назва + одиниця + ціль» (див. `docs/TRACKERS.md`).
 */
export const TRACKER_CATALOG: readonly TrackerCatalogEntry[] = [
  {
    key: "steps",
    title: "Кроки",
    unit: "кроків",
    step: 500,
    goal: 8000,
    min: 0,
    max: 100000,
    icon: "footsteps",
  },
  { key: "water", title: "Вода", unit: "л", step: 0.25, goal: 2, min: 0, max: 20, icon: "droplet" },
  { key: "sleep", title: "Сон", unit: "год", step: 0.5, goal: 8, min: 0, max: 24, icon: "moon" },
  {
    key: "weight",
    title: "Вага",
    unit: "кг",
    step: 0.1,
    goal: null,
    min: 0,
    max: 500,
    icon: "progress",
  },
  { key: "mood", title: "Настрій", unit: "бал", step: 1, goal: 4, min: 1, max: 5, icon: "heart" },
  { key: "energy", title: "Енергія", unit: "бал", step: 1, goal: 4, min: 1, max: 5, icon: "sun" },
  { key: "workout", title: "Рух", unit: "хв", step: 5, goal: 30, min: 0, max: 600, icon: "flame" },
  {
    key: "reading",
    title: "Читання",
    unit: "хв",
    step: 5,
    goal: 20,
    min: 0,
    max: 600,
    icon: "book",
  },
  {
    key: "spend",
    title: "Витрати",
    unit: "₴",
    step: 10,
    goal: null,
    min: 0,
    max: TRACKER_LIMITS.value,
    icon: "wallet",
  },
];

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** День у форматі `YYYY-MM-DD` — реальна дата, а не «2026-02-31». */
export function isValidTrackerDay(value: string): boolean {
  if (!DAY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

/** Зсув дня в календарі (UTC — щоб перехід на літній час не губив день). */
export function addTrackerDays(day: string, offset: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

/** Сьогоднішній день **людини**, а не сервера: у Києві він настає раніше за UTC. */
export function todayTrackerDay(now: Date = new Date()): string {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/** День, який ще можна записати: майбутнє — ні, «завтра» приймаємо через часові зони. */
export function isWritableTrackerDay(day: string, now: Date = new Date()): boolean {
  if (!isValidTrackerDay(day)) return false;
  return day <= addTrackerDays(todayTrackerDay(now), 1);
}

/** Число в межах трекера; поза межами або не число — `null`, а не обрізане значення. */
export function trackerValue(
  value: unknown,
  tracker: Pick<TrackerFields, "min" | "max">,
): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < tracker.min) return null;
  if (tracker.max !== null && value > tracker.max) return null;
  if (Math.abs(value) > TRACKER_LIMITS.value) return null;
  return Math.round(value * 1000) / 1000;
}

function text(value: unknown, limit: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > limit ? null : trimmed;
}

function measure(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value >= min && value <= max ? value : null;
}

/** Форма власного трекера. Межі — ті самі, що перевіряє база й поле вводу. */
export function validateTrackerFields(
  raw: unknown,
): { ok: true; value: TrackerFields } | { ok: false; message: string } {
  if (!raw || typeof raw !== "object") return { ok: false, message: "Порожня форма." };
  const body = raw as Record<string, unknown>;

  const title = text(body.title, TRACKER_LIMITS.title);
  if (!title) return { ok: false, message: "Назва — від 1 до 40 символів." };

  const unit = text(body.unit ?? "", TRACKER_LIMITS.unit);
  if (unit === null) return { ok: false, message: "Одиниця — до 8 символів." };

  const step = measure(body.step, 0.001, 100000);
  if (step === null) return { ok: false, message: "Крок має бути додатним числом." };

  const min = measure(body.min ?? 0, -TRACKER_LIMITS.value, TRACKER_LIMITS.value);
  if (min === null) return { ok: false, message: "Мінімум — число." };

  const rawMax = body.max ?? null;
  const max = rawMax === null ? null : measure(rawMax, -TRACKER_LIMITS.value, TRACKER_LIMITS.value);
  if (rawMax !== null && max === null) return { ok: false, message: "Максимум — число." };
  if (max !== null && max <= min)
    return { ok: false, message: "Максимум має бути більшим за мінімум." };

  const rawGoal = body.goal ?? null;
  const goal = rawGoal === null ? null : measure(rawGoal, min, max ?? TRACKER_LIMITS.value);
  if (rawGoal !== null && goal === null) {
    return { ok: false, message: "Ціль має лежати в межах трекера." };
  }

  return { ok: true, value: { title, unit, step, goal, min, max } };
}

/** Серія за вікно: дні без запису стоять `null`, тож графік не зсуває історію. */
export function buildTrackerSeries(
  entries: readonly TrackerEntry[],
  endDay: string,
  days: number,
): TrackerPoint[] {
  const byDay = new Map(entries.map((entry) => [entry.day, entry.value]));
  const points: TrackerPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const day = addTrackerDays(endDay, -offset);
    points.push({ day, value: byDay.get(day) ?? null });
  }
  return points;
}

/**
 * Серія — до **останнього запису**, а не до сьогодні.
 *
 * Інакше людина, яка записала вчора, бачила б нуль: сьогоднішній день ще не
 * прожито, і «нема запису» не означає «нуль кроків».
 */
export function trackerStreak(entries: readonly TrackerEntry[], endDay: string): number {
  const days = new Set(entries.map((entry) => entry.day));
  let cursor = days.has(endDay) ? endDay : addTrackerDays(endDay, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = addTrackerDays(cursor, -1);
  }
  return streak;
}

function windowAverage(entries: readonly TrackerEntry[], from: string, to: string): number | null {
  const values = entries
    .filter((entry) => entry.day >= from && entry.day <= to)
    .map((e) => e.value);
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Звіт за вікно; попереднє вікно тієї ж довжини дає «краще/гірше». */
export function trackerReport(
  entries: readonly TrackerEntry[],
  options: { endDay: string; days: number; goal: number | null },
): TrackerReport {
  const { endDay, days, goal } = options;
  const series = buildTrackerSeries(entries, endDay, days);
  const filled = series.filter(
    (point): point is { day: string; value: number } => point.value !== null,
  );
  const total = filled.reduce((sum, point) => sum + point.value, 0);
  const start = addTrackerDays(endDay, -(days - 1));

  let peak: TrackerEntry | null = null;
  for (const point of filled) {
    const entry = { day: point.day, value: point.value, note: "" };
    if (!peak || entry.value > peak.value) peak = entry;
  }

  const goalDays = goal === null ? 0 : filled.filter((point) => point.value >= goal).length;
  const previousTo = addTrackerDays(start, -1);
  const previousFrom = addTrackerDays(previousTo, -(days - 1));
  const current = filled.length ? total / filled.length : null;
  const previous = windowAverage(entries, previousFrom, previousTo);
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

/** Число для екрана: без зайвих нулів, з розділювачем тисяч. */
export function formatTrackerValue(value: number): string {
  return value.toLocaleString("uk-UA", { maximumFractionDigits: 3 });
}

/** Значення з одиницею: «2,5 л», «8000 кроків». */
export function formatTrackerAmount(value: number, unit: string): string {
  const amount = formatTrackerValue(value);
  return unit ? `${amount} ${unit}` : amount;
}
