/**
 * Трекери — один універсальний трекер: **запис із моментом часу**. День — не
 * сутність запису, а кошик: він потрібен лише накопичувальним міркам (вода,
 * кроки). Тому вид задають дані: `mode` каже, як читати записи (`sum` —
 * додаються, `read` — беруть останній); гілок у UI немає. Правила — у
 * `docs/TRACKERS.md`.
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
  mode: TrackerMode;
}

/**
 * Як читати записи мірки.
 *
 * `sum` — записи додаються (вода, кроки, витрати): день має суму, а ціль —
 * сенс. `read` — кожен запис є виміром (вага, настрій, сон): показуємо
 * **останній**, а сумувати виміри не можна (два настрої по 4 бали — не 8).
 */
export type TrackerMode = "sum" | "read";

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

/**
 * Рядок дня для аналітики. За день може бути багато записів — як їх звести,
 * каже `mode`: сума («випито тричі» — це один день) чи останній вимір.
 */
export interface TrackerDayValue {
  day: string;
  value: number;
}

/** Запис трекера (рядок `tracker_entries`): окремий вимір із моментом часу. */
export interface TrackerEntry {
  id: number;
  day: string;
  value: number;
  note: string;
  /** Момент запису (`YYYY-MM-DD HH:MM:SS`); `null` — рядок старший за колонку. */
  loggedAt: string | null;
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
  peak: TrackerDayValue | null;
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
    mode: "sum",
  },
  {
    key: "water",
    title: "Вода",
    unit: "л",
    step: 0.25,
    goal: 2,
    min: 0,
    max: 20,
    icon: "droplet",
    mode: "sum",
  },
  {
    key: "sleep",
    title: "Сон",
    unit: "год",
    step: 0.5,
    goal: 8,
    min: 0,
    max: 24,
    icon: "moon",
    mode: "read",
  },
  {
    key: "weight",
    title: "Вага",
    unit: "кг",
    step: 0.1,
    goal: null,
    min: 0,
    max: 500,
    icon: "progress",
    mode: "read",
  },
  {
    key: "mood",
    title: "Настрій",
    unit: "бал",
    step: 1,
    goal: 4,
    min: 1,
    max: 5,
    icon: "heart",
    mode: "read",
  },
  {
    key: "energy",
    title: "Енергія",
    unit: "бал",
    step: 1,
    goal: 4,
    min: 1,
    max: 5,
    icon: "sun",
    mode: "read",
  },
  {
    key: "workout",
    title: "Рух",
    unit: "хв",
    step: 5,
    goal: 30,
    min: 0,
    max: 600,
    icon: "flame",
    mode: "sum",
  },
  {
    key: "reading",
    title: "Читання",
    unit: "хв",
    step: 5,
    goal: 20,
    min: 0,
    max: 600,
    icon: "book",
    mode: "sum",
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
    mode: "sum",
  },
];

const CATALOG_BY_KEY = new Map(TRACKER_CATALOG.map((entry) => [entry.key, entry]));

/**
 * Як читати записи цієї мірки.
 *
 * Вид — **дані, а не здогад**: його обирає людина (поле «Як читати записи»), і
 * він лежить у `trackers.mode`. Колонка жива база приїде як `NULL` — тоді, і
 * лише тоді, беремо старий здогад (каталог за ключем, далі «ціль ⇒ сума»),
 * щоб рядки, створені до колонки, читались як читались.
 */
export function trackerMode(tracker: {
  key: string;
  goal: number | null;
  mode?: string | null;
}): TrackerMode {
  if (tracker.mode === "sum" || tracker.mode === "read") return tracker.mode;
  return CATALOG_BY_KEY.get(tracker.key)?.mode ?? (tracker.goal === null ? "read" : "sum");
}

/** Вид із нерозпізнаного вводу: `null` — не вид (його добере `trackerMode`). */
export function parseTrackerMode(value: unknown): TrackerMode | null {
  return value === "sum" || value === "read" ? value : null;
}

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

  // Вид не задають явно — беремо типовий за ціллю: ціль без накопичення не має
  // сенсу, а вимір із ціллю (цільова вага) — має, тож у формі вид видно його ж.
  const mode = parseTrackerMode(body.mode) ?? (goal === null ? "read" : "sum");

  return { ok: true, value: { title, unit, step, goal, min, max, mode } };
}

/**
 * Записи за зростанням: день, момент, номер — той самий порядок, що в історії.
 * Два записи в одну секунду не міняються місцями, бо номер останній у ключі.
 */
export type TrackerEntryOrder = Pick<TrackerEntry, "day"> &
  Partial<Pick<TrackerEntry, "id" | "loggedAt">>;

export function compareTrackerEntries(a: TrackerEntryOrder, b: TrackerEntryOrder): number {
  const left = `${a.day} ${a.loggedAt ?? ""} ${String(a.id ?? 0).padStart(9, "0")}`;
  const right = `${b.day} ${b.loggedAt ?? ""} ${String(b.id ?? 0).padStart(9, "0")}`;
  return left < right ? -1 : left > right ? 1 : 0;
}

export function sortedTrackerEntries<T extends TrackerEntryOrder>(entries: readonly T[]): T[] {
  return [...entries].sort(compareTrackerEntries);
}

/** Останній запис — те, що показує мірка режиму `read` замість «сьогодні». */
export function trackerLatest<T extends TrackerEntry>(entries: readonly T[]): T | null {
  let latest: T | null = null;
  for (const entry of entries) {
    if (!latest || compareTrackerEntries(latest, entry) < 0) latest = entry;
  }
  return latest;
}

/** Запис перед останнім: «−0,5 кг від попереднього» — без жодного вікна. */
export function trackerPrevious<T extends TrackerEntry>(entries: readonly T[]): T | null {
  const sorted = sortedTrackerEntries(entries);
  return sorted.length > 1 ? sorted[sorted.length - 2] : null;
}

/** Записи вікна — історія, графік і звіт читають один список, а не три. */
export function trackerWindow<T extends TrackerEntry>(
  entries: readonly T[],
  endDay: string,
  days: number,
): T[] {
  const from = addTrackerDays(endDay, -(days - 1));
  return sortedTrackerEntries(entries).filter((entry) => entry.day >= from && entry.day <= endDay);
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
