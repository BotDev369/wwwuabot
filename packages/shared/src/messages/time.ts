/**
 * Час у списку розмов і в бульбашці повідомлення — чисті функції.
 *
 * Один рядок списку має фіксовану ширину, а дата — різна довжина: «15:19»
 * (сьогодні), «16.09» (цього року), «16.09.2025» (давніше). Саме тому це
 * окреме правило, а не `formatStamp`: повний штамп у списку відсунув би ім'я
 * співрозмовника й обрізався б сам.
 *
 * @module @wwwuabot/shared/messages
 */

import { sqliteTimestamp } from "../utils/datetime";

/** Дві цифри з провідним нулем — `padStart` без залежностей і без локалі. */
function two(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * Короткий час для списку розмов: час — для сьогоднішніх, дата — для старіших.
 *
 * `fallback` повертається, коли рядок дати непорозумілий: показати сиру
 * мітку часу гірше, ніж не показати нічого (`sqliteTimestamp` уже віддає `0`
 * замість помилки).
 */
export function messageTime(value: string | null | undefined, now = new Date()): string {
  const stamp = value ? sqliteTimestamp(value) : 0;
  if (!stamp) return "";

  const date = new Date(stamp);
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) return `${two(date.getHours())}:${two(date.getMinutes())}`;

  const short = `${two(date.getDate())}.${two(date.getMonth() + 1)}`;
  return date.getFullYear() === now.getFullYear() ? short : `${short}.${date.getFullYear()}`;
}

/** Час під бульбашкою: завжди години й хвилини — там місце є. */
export function messageClock(value: string | null | undefined): string {
  const stamp = value ? sqliteTimestamp(value) : 0;
  if (!stamp) return "";
  const date = new Date(stamp);
  return `${two(date.getHours())}:${two(date.getMinutes())}`;
}
