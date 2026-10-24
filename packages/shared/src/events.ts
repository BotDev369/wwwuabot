/**
 * Події людей — те, що вони роблять у боті й на платформі: хто, де, що, коли.
 * Стан людини каже, якою вона стала; подія — що вона для цього зробила.
 * Опис — тут, запис — `@wwwuabot/shared/database/user-events`, показ — адмінка;
 * правило одне на всі три місця. Деталі — `docs/EVENTS.md`.
 *
 * @module @wwwuabot/shared/events
 */

/** Звідки подія: чат бота чи Mini App. */
export const EVENT_SURFACES = ["bot", "platform"] as const;
export type EventSurface = (typeof EVENT_SURFACES)[number];

/**
 * Вид події. `request` — дія на платформі (шлях API), решта — те, що прийшло
 * від Telegram, і саме в тих словах, у яких це називає Bot API.
 */
export const EVENT_KINDS = [
  "command",
  "message",
  "callback",
  "inline_query",
  "edited_message",
  "request",
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export type EventStatus = "ok" | "error";

/** Рядок, який пише воркер: без номера й без імені — їх додає база. */
export interface UserEventInput {
  userId: number;
  surface: EventSurface;
  kind: EventKind;
  /** Що саме сталося: текст, `callback_data` або `METHOD /api/…`. */
  action: string;
  /** Подробиці, які не влізли в `action` (напр. вид файлу); іноді `null`. */
  details?: string | null;
  status?: EventStatus;
}

/** Подія разом із тим, ким людина була на момент показу (з рядка `users`). */
export interface UserEvent extends Required<Omit<UserEventInput, "details">> {
  id: number;
  details: string | null;
  createdAt: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}

/** Один рядок зведення: людина й те, скільки вона зробила за діапазон. */
export interface EventUserSummary {
  userId: number;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  count: number;
  lastAt: string;
}

export interface EventSummary {
  from: string;
  to: string;
  total: number;
  bySurface: Record<EventSurface, number>;
  users: EventUserSummary[];
}

export interface EventList {
  from: string;
  to: string;
  total: number;
  items: UserEvent[];
}

export const SURFACE_LABELS: Record<EventSurface, string> = {
  bot: "Бот",
  platform: "Платформа",
};

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  command: "Команда",
  message: "Повідомлення",
  callback: "Кнопка",
  inline_query: "Inline-запит",
  edited_message: "Правка",
  request: "Дія",
};

export function isEventSurface(value: unknown): value is EventSurface {
  return typeof value === "string" && (EVENT_SURFACES as readonly string[]).includes(value);
}

export function isEventKind(value: unknown): value is EventKind {
  return typeof value === "string" && (EVENT_KINDS as readonly string[]).includes(value);
}

export function surfaceLabel(value: string): string {
  return isEventSurface(value) ? SURFACE_LABELS[value] : value;
}

export function eventKindLabel(value: string): string {
  return isEventKind(value) ? EVENT_KIND_LABELS[value] : value;
}

/** HTTP-метод дії платформи у першому слові (`GET /api/favorites`). */
export function eventMethod(action: string): string | null {
  const match = /^(GET|POST|PUT|PATCH|DELETE)\s+(\/\S*)$/.exec(action);
  return match ? match[1] : null;
}

/**
 * Дія платформи: метод і шлях без запиту.
 *
 * Query навмисно відкидається: у ньому буває пошуковий рядок людини, а
 * поведінку описує екран, а не те, що вона в ньому шукала.
 */
export function platformAction(method: string, pathname: string): string {
  return `${method.toUpperCase()} ${pathname}`;
}

/** Дія платформи не для журналу: службове, адмінське й публічне без людини. */
const PLATFORM_SKIP_PREFIXES = ["/api/admin/", "/api/portal/", "/api/bot/"] as const;

/**
 * Запити, які робить сам застосунок, а не людина: перевірка допуску при вході,
 * добір профілю й опитування позначки непрочитаних. Вони повторюються самі по
 * собі (позначка — кожні кілька секунд), тож у журналі перетворюють годину
 * роботи на сотню «дотиків», яких не було, і топлять справжні дії.
 */
const PLATFORM_AUTOMATIC_PATHS = [
  "/api/user/access",
  "/api/user/profile",
  "/api/messages/badge",
] as const;

/** Чи цей запит — дія людини, варта рядка в журналі. */
export function shouldRecordPlatformRequest(pathname: string): boolean {
  if (!pathname.startsWith("/api/")) return false;
  if (PLATFORM_SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return false;
  return !PLATFORM_AUTOMATIC_PATHS.some((path) => pathname === path);
}

/** Типовий діапазон — доба: «що робили сьогодні» питають найчастіше. */
export const EVENT_RANGE_HOURS = 24;

/** Обрізає текст події: журнал описує дію, а не зберігає переписку. */
export const EVENT_TEXT_MAX = 500;

export function truncateEventText(text: string, max = EVENT_TEXT_MAX): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** Діапазон у форматі колонки (`YYYY-MM-DD HH:MM:SS`, UTC). */
export interface EventRange {
  from: string;
  to: string;
}

function parseStamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  const iso = /[TZ]/.test(value) ? value : `${value.replace(" ", "T")}Z`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sqlite(date: Date): string {
  return date.toISOString().replace("T", " ").slice(0, 19);
}

/**
 * Діапазон для запиту: обидві межі у форматі SQLite.
 *
 * Незадана межа добирається з іншої (типова доба), а переставлені місцями
 * межі міняються назад: адмінка дає два поля, і людина цілком може вибрати
 * «до» раніше за «від». Порожній результат тоді виглядав би як «подій немає».
 */
export function resolveEventRange(
  input: { from?: string | null; to?: string | null } = {},
  now: Date = new Date(),
): EventRange {
  const to = parseStamp(input.to) ?? now;
  const fallbackFrom = new Date(to.getTime() - EVENT_RANGE_HOURS * 3600_000);
  const from = parseStamp(input.from) ?? fallbackFrom;
  return from > to
    ? { from: sqlite(to), to: sqlite(from) }
    : { from: sqlite(from), to: sqlite(to) };
}
