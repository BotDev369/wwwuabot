/**
 * Помічники екрана «Аналітика»: дані й перетворення, без стану й розмітки.
 *
 * Поля `datetime-local` дають локальний рядок без зони, а API приймає ISO:
 * змішувати їх означало б показувати один час, а шукати інший.
 *
 * @module web-admin-dev/src/pages/analytics/analytics-view
 */

import {
  screenLabel,
  type EventKind,
  type EventSurface,
  type EventUserSummary,
  type UserEvent,
} from "@wwwuabot/shared/events";

export type AnalyticsMode = "users" | "time";

/** Готові проміжки: «остання доба / тиждень / місяць». */
export const EVENT_PRESETS = [
  { key: "day", label: "Доба", hours: 24 },
  { key: "week", label: "Тиждень", hours: 24 * 7 },
  { key: "month", label: "Місяць", hours: 24 * 30 },
] as const;

export type EventPresetKey = (typeof EVENT_PRESETS)[number]["key"];

/** Одна сторінка журналу: більше в один екран усе одно не влізе. */
export const EVENT_PAGE_SIZE = 100;

export interface EventRangeInput {
  /** ISO-рядки — саме їх приймає API. */
  from: string;
  to: string;
}

export function presetRange(hours: number, now: Date = new Date()): EventRangeInput {
  const to = now;
  const from = new Date(to.getTime() - hours * 3600_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * Проміжок після «Оновити».
 *
 * Готовий проміжок — це ковзне вікно («остання доба»), тож оновлення мусить
 * зсунути його до поточного часу: інакше запит іде в той самий закритий
 * інтервал, зафіксований при відкритті екрана, і події, зроблені після нього,
 * не видно ніколи. Ручний проміжок лишається як його задали.
 */
export function refreshRange(
  current: EventRangeInput,
  presetHours: number | null,
  now: Date = new Date(),
): EventRangeInput {
  return presetHours === null ? current : presetRange(presetHours, now);
}

/** Мітка «коли оновлено» — лише час: дату видно в діапазоні. */
export function clockStamp(ms: number): string {
  const date = new Date(ms);
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** ISO → значення поля `datetime-local` (локальний час, без секунд). */
export function toDateTimeInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Два поля → діапазон для API.
 *
 * Порожнє або невалідне поле не ламає запит: береться типовий проміжок від
 * іншої межі. Інакше людина бачила б «подій немає» замість даних через одну
 * стерту цифру.
 */
export function rangeFromInputs(
  fromInput: string,
  toInput: string,
  fallbackHours = 24,
): EventRangeInput {
  const to = new Date(toInput);
  const toDate = Number.isNaN(to.getTime()) ? new Date() : to;
  const from = new Date(fromInput);
  const fromDate = Number.isNaN(from.getTime())
    ? new Date(toDate.getTime() - fallbackHours * 3600_000)
    : from;
  return fromDate > toDate
    ? { from: toDate.toISOString(), to: fromDate.toISOString() }
    : { from: fromDate.toISOString(), to: toDate.toISOString() };
}

/** Ім'я людини для заголовка акордеона: спершу те, що дала платформа/Telegram. */
export function userLabel(
  user: Pick<EventUserSummary, "firstName" | "lastName" | "username" | "userId">,
): string {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  return user.username ? `@${user.username}` : `#${user.userId}`;
}

export function userMeta(user: Pick<EventUserSummary, "username" | "userId">): string {
  return user.username ? `@${user.username} · ${user.userId}` : `${user.userId}`;
}

/** Метод HTTP з дії платформи: у списку це бейдж, а не частина рядка. */
export function actionMethod(action: string): string {
  const method = /^(GET|POST|PUT|PATCH|DELETE)\s+/.exec(action);
  return method ? method[1] : "ДІЯ";
}

/**
 * Дія без методу — те, що показують після бейджа.
 *
 * У перегляду в `action` лежить **ключ екрана**, а не шлях: людині показуємо
 * назву («Трекери»), бо шлях API вона читати не мусить.
 */
export function actionText(action: string, kind?: EventKind): string {
  if (kind === "view") return screenLabel(action);
  return action.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/, "");
}

export function surfaceClass(surface: EventSurface): string {
  return `ana-surface ana-surface--${surface}`;
}

/** Догортання сторінок: те саме, що показали, не дублюється. */
export function mergeEvents(existing: UserEvent[], incoming: UserEvent[]): UserEvent[] {
  const seen = new Set(existing.map((event) => event.id));
  return [...existing, ...incoming.filter((event) => !seen.has(event.id))];
}
