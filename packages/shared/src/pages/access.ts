/**
 * Хто веде сторінку: власник і адміни — одне правило на клієнт і сервер.
 *
 * **Навіщо адміни.** Сторінку (а разом із нею магазин) веде не завжди одна
 * людина: товари заводить один, замовлення приймає інший. Другого власника в
 * рядка бути не може — `owner_id` один, — тож «веде» стало **роллю**: власник
 * плюс список адмінів (`scenarios.admin_ids`, JSON-масив Telegram-id).
 *
 * **Роль, а не прапорець «доступ є».** Власник і адмін бачать те саме —
 * замовлення, повідомлення покупців, товари, — але різняться в одному: склад
 * адмінів міняє **тільки власник** і сторінку видаляє теж він. Тому роль
 * повертається словом, а не `true`, і саме нею питає той, хто має право.
 *
 * **Чому не в `WHERE`, як було.** Доти право власника стояло умовою в запиті
 * (`WHERE owner_id = ?`) — і це було найдешевше. Адміни лежать **JSON-ом**, і
 * SQL про них нічого не знає, тож рішення ухвалює ця функція, а запит лишається
 * грубою відбіркою (`LIKE`, див. `pages.service.ts`). Щоб правило не
 * розповзлося, у сервісів **один вхід** — `readManaged` / `manageShop`: шлях,
 * який не спитав роль, просто не дістане рядка.
 *
 * @module @wwwuabot/shared/pages
 */

import type { PageRole, PageStaff, UserPage } from "./types";

/** Стеля адмінів на сторінку: це помічники, а не штат. */
export const PAGE_ADMINS_MAX = 20;

/**
 * Telegram-id з колонки `admin_ids`.
 *
 * `NULL` — адмінів немає: колонку додано наявній таблиці, тож у рядків, які не
 * переписували, там саме `NULL`, а не `[]`. Сміття в колонці не ламає читання:
 * у список потрапляють лише цілі додатні числа.
 */
export function pageAdminIds(raw: unknown): number[] {
  if (typeof raw !== "string" || !raw.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  return cleanAdminIds(parsed);
}

/**
 * Список адмінів із форми або колонки: цілі id, без дублів і в межах стелі.
 *
 * Межі тут, а не в SQL: у JSON-колонці обмеження `CHECK` не поставити, і єдине
 * місце, де склад справді перевіряється, — той, хто його записує.
 */
export function cleanAdminIds(raw: unknown): number[] {
  const source = Array.isArray(raw) ? raw : [];
  const ids: number[] = [];
  for (const entry of source) {
    const id = Number(entry);
    if (!Number.isInteger(id) || id <= 0) continue;
    if (ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= PAGE_ADMINS_MAX) break;
  }
  return ids;
}

/** Колонка `admin_ids` зі списку: те саме, що читає `pageAdminIds`. */
export function adminIdsJson(ids: readonly number[]): string {
  return JSON.stringify(cleanAdminIds(ids));
}

/**
 * Роль людини: `owner` старша за `admin`, `null` — сторінка не її.
 *
 * Власник може стояти і в списку адмінів (він же теж «веде»), і тоді роль
 * усе одно `owner`: два джерела того самого в цьому місці розійшлися б мовчки.
 */
export function pageRole(
  ownerId: number | null,
  adminIds: readonly number[],
  userId: number,
): PageRole | null {
  if (ownerId !== null && ownerId === userId) return "owner";
  return adminIds.includes(userId) ? "admin" : null;
}

/** Чи має людина доступ до сторінки: власник або адмін — обидва «ведуть». */
export function isPageManager(
  ownerId: number | null,
  adminIds: readonly number[],
  userId: number,
): boolean {
  return pageRole(ownerId, adminIds, userId) !== null;
}

/**
 * Кому слати те, що стосується сторінки: власник першим, далі адміни — без
 * повторів і без власника вдруге, навіть якщо він стоїть у списку адмінів.
 */
export function pageStaffIds(ownerId: number | null, adminIds: readonly number[]): number[] {
  const ids = ownerId !== null && ownerId > 0 ? [ownerId] : [];
  for (const id of cleanAdminIds(adminIds)) {
    if (!ids.includes(id)) ids.push(id);
  }
  return ids;
}

/** Склад адмінів зі сторінки: виводиться зі `staff`, а не тримається копією. */
export function pageAdminsOf(page: UserPage): number[] {
  return page.staff.filter((member: PageStaff) => member.role === "admin").map((m) => m.id);
}

/**
 * Перевірка поля «Telegram ID» — те, що показує діалог; `null` — значення годиться.
 *
 * `current` — уже додані: та сама людина вдруге нічого не додає, і краще сказати
 * це словом, ніж зробити вигляд, що список змінився.
 */
export function adminIdError(raw: unknown, current: readonly number[] = []): string | null {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return "Впишіть Telegram ID";
  if (!/^\d+$/u.test(text)) return "Telegram ID — це лише цифри";
  const id = Number(text);
  if (!Number.isSafeInteger(id) || id <= 0) return "Не схоже на Telegram ID";
  if (current.includes(id)) return "Ця людина вже адміністратор";
  return null;
}
