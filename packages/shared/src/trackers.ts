/**
 * Трекери — один універсальний трекер: **запис із моментом часу**. День — не
 * сутність запису, а кошик: він потрібен лише накопичувальним міркам (вода,
 * кроки). Тому вид задають дані: `mode` каже, як читати записи (`sum` —
 * додаються, `read` — беруть останній); гілок у UI немає. Правила — у
 * `docs/TRACKERS.md`.
 * @module @wwwuabot/shared/trackers
 */

import type { IconName } from "./components/icon-names";
import { catalogEntry, TRACKER_LIMITS } from "./trackers/catalog";
// Поверхні «Шаблони» / «Публічні» — окремий модуль; споживачі лишаються тут.
export type { PublicTracker, TrackerCopySource, TrackerTemplate } from "./trackers/library";
export { parseTrackerSource, trackerCopyKey } from "./trackers/library";

// Каталог — дані окремим модулем; споживачі лишаються на цій поверхні.
export type { TrackerCatalogEntry, TrackerCatalogGroupKey } from "./trackers/catalog";
export {
  TRACKER_CATALOG,
  TRACKER_CATALOG_GROUPS,
  TRACKER_OWN_GROUP_KEY,
  catalogEntry,
  TRACKER_LIMITS,
} from "./trackers/catalog";
// Довідник одиниць — дані окремим модулем, як і каталог.
export type { TrackerUnitGroup } from "./trackers/units";
export { TRACKER_UNIT_GROUPS, isTrackerUnit } from "./trackers/units";
// Періоди аналітики — колонки «рік / місяць / день / година / 15 хв».
export type { TrackerBucket, TrackerBucketOptions } from "./trackers/buckets";
export {
  trackerHourBuckets,
  trackerMinuteBuckets,
  trackerMonthBuckets,
  trackerMonthDayBuckets,
  trackerRangeBuckets,
  trackerWeekBuckets,
  trackerYearBuckets,
} from "./trackers/buckets";
// Групи — дерево власника; спільні функції — тут само.
export type { TrackerGroup, TrackerGroupNode, TrackerGroupOption } from "./trackers/groups";
export {
  TRACKER_GROUP_LIMITS,
  buildTrackerGroupTree,
  countTrackerGroupNode,
  flattenTrackerGroupTree,
  validateTrackerGroupFields,
} from "./trackers/groups";

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
  /**
   * Що людина записує: число (вода, кроки, вага) чи так-ні (тренування,
   * «не палю»). Для «так-ні» одиниця, крок і ціль не існують — це статус
   * дня, а не міра, тож форма їх не показує, а сервер не приймає.
   */
  valueType: TrackerValueType;
}

/** Тип запису мірки: число або так-ні. */
export type TrackerValueType = "number" | "boolean";

/**
 * Як читати записи мірки.
 *
 * `sum` — записи додаються (вода, кроки, витрати): день має суму, а ціль —
 * сенс. `read` — кожен запис є виміром (вага, настрій, сон): показуємо
 * **останній**, а сумувати виміри не можна (два настрої по 4 бали — не 8).
 */
export type TrackerMode = "sum" | "read";

/** Трекер людини: рядок `trackers` (ключ унікальний у межах власника). */
export interface Tracker extends TrackerFields {
  id: number;
  key: string;
  icon: IconName;
  isBuiltin: boolean;
  /** Група власника; `null` — людина ще не віднесла трекер нікуди. */
  groupId: number | null;
  /**
   * Пріоритет 1–9 (1 — найвищий); `null` або немає поля — не заданий. Колонка
   * на живій базі приходить як `NULL`, тож читач мусить це приймати.
   */
  priority?: number | null;
  /** Звідки копія: `catalog:<key>`, `public:<id>`; `null` — власна мірка. */
  source?: string | null;
  /** Визначення відкрите іншим; виміри не публікуються ніколи. */
  isPublic?: boolean;
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

/**
 * Як читати записи цієї мірки.
 *
 * Вид — **дані, а не здогад**: його обирає людина (поле «Як читати записи» у числі;
 * «так-ні» формі не показують — типовий «останній»), і він лежить у `trackers.mode`.
 * Колонка жива база приїде як `NULL` — тоді, і лише тоді, беремо старий здогад (каталог
 * за ключем, далі «ціль ⇒ сума»), щоб рядки, створені до колонки, читались як читались.
 */
export function trackerMode(tracker: {
  key: string;
  goal: number | null;
  mode?: string | null;
}): TrackerMode {
  if (tracker.mode === "sum" || tracker.mode === "read") return tracker.mode;
  return catalogEntry(tracker.key)?.mode ?? (tracker.goal === null ? "read" : "sum");
}

/** Вид із нерозпізнаного вводу: `null` — не вид (його добере `trackerMode`). */
export function parseTrackerMode(value: unknown): TrackerMode | null {
  return value === "sum" || value === "read" ? value : null;
}

/**
 * Тип запису цієї мірки. Колонку, добрану на живій базі `ensureTables`,
 * читаємо з `COALESCE`, тож `null` тут — не «немає типу», а «число»:
 * рядки, створені до колонки, лишаються числами.
 */
export function trackerValueType(tracker: { valueType?: string | null }): TrackerValueType {
  return tracker.valueType === "boolean" ? "boolean" : "number";
}

/** Тип із нерозпізнаного вводу: `null` — не тип (його добере `trackerValueType`). */
export function parseTrackerValueType(value: unknown): TrackerValueType | null {
  return value === "number" || value === "boolean" ? value : null;
}

/**
 * Пріоритет — **ранг мірки**: 1 найвищий … 9 найнижчий, `null` — не заданий
 * (типовий стан, у якому лишаються всі наявні трекери). Шкала одна на всі
 * мірки: десяте значення — не число, а «відсутній», тож вибір має 10 кнопок.
 */
export const TRACKER_PRIORITIES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type TrackerPriority = (typeof TRACKER_PRIORITIES)[number];

/** Рівень із вводу: `null` — «відсутній», `undefined` — не рівень (відмова). */
export function parseTrackerPriority(value: unknown): TrackerPriority | null | undefined {
  if (value === null) return null;
  return TRACKER_PRIORITIES.includes(value as TrackerPriority)
    ? (value as TrackerPriority)
    : undefined;
}

/** Підпис рівня: «Відсутній» або саме число — так його читають на кнопках. */
export function trackerPriorityLabel(priority: number | null): string {
  return priority === null ? "Відсутній" : String(priority);
}

/** Назва мірки — та сама межа, що у формі створення; `null` — відмова. */
export function parseTrackerTitle(raw: unknown): string | null {
  const title = text(raw, TRACKER_LIMITS.title);
  return title ? title : null;
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

  // Тип — **раніше за числові поля**: «так-ні» не має ні одиниці, ні кроку, ні
  // цілі, тож форма їх не показує, а сервер не має вимагати полів, яких у цього
  // типу не існує (межа запису 0…1 ставить він сам).
  const valueType = parseTrackerValueType(body.valueType) ?? "number";
  if (valueType === "boolean") {
    // Типовий вид — «останній»: без цілі сума не має сенсу, а статус дня — має.
    const mode = parseTrackerMode(body.mode) ?? "read";
    return {
      ok: true,
      value: { title, unit: "", step: 1, goal: null, min: 0, max: 1, mode, valueType },
    };
  }

  const unit = text(body.unit ?? "", TRACKER_LIMITS.unit);
  if (unit === null) return { ok: false, message: `Одиниця — до ${TRACKER_LIMITS.unit} символів.` };

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

  return { ok: true, value: { title, unit, step, goal, min, max, mode, valueType } };
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

/** Число для екрана: без зайвих нулів, з розділювачем тисяч. */
export function formatTrackerValue(value: number): string {
  return value.toLocaleString("uk-UA", { maximumFractionDigits: 3 });
}

/** Значення з одиницею: «2,5 л», «8000 кроків». */
export function formatTrackerAmount(value: number, unit: string): string {
  const amount = formatTrackerValue(value);
  return unit ? `${amount} ${unit}` : amount;
}

/**
 * Запис **для показу**: у трекера «так-ні» 1/0 читається статусом —
 * «так»/«ні» (день із нулем — теж «ні»: нуль записаний, а не пропущений).
 * Числові трекери йдуть звичним форматом із одиницею.
 *
 * Лише для самих записів і днів: **середнє й сума не є статусом** (0,7
 * «так» не буває), тож агрегати показуються числом.
 */
export function trackerAmountText(
  value: number | null,
  tracker: Pick<TrackerFields, "valueType" | "unit">,
): string {
  if (value === null) return "—";
  if (tracker.valueType === "boolean") return value > 0 ? "так" : "ні";
  return formatTrackerAmount(value, tracker.unit);
}
