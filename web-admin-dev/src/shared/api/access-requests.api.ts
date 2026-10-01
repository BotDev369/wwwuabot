/**
 * Пошта про звернення зі сторінки відмови — з панелі.
 *
 * Усі чотири дії живуть під `/api/admin/`, тож адмін-гейт перевіряє їх на
 * сервері (cookie `admin_session`), а клієнт лише говорить «список», «створити»,
 * «змінити», «видалити» (див. `api-dev/src/routes/access-requests.ts`).
 *
 * Тип рядка — спільний (`@wwwuabot/shared/access-requests`): сервер, панель і
 * правило межі тексту дивляться в одне місце.
 *
 * @module web-admin-dev/src/shared/api/access-requests.api
 */

import type { AccessRequestItem } from "@wwwuabot/shared/access-requests";
import { apiFetch } from "./client";

/** Звернення, нові першими. */
export async function listAccessRequests(): Promise<AccessRequestItem[]> {
  const res = await apiFetch<{ ok: boolean; items: AccessRequestItem[] }>(
    "/api/admin/access-requests",
  );
  return res.items ?? [];
}

/** Записати звернення, що прийшло поза платформою (напр. у Telegram). */
export async function createAccessRequest(userId: number, text: string): Promise<void> {
  await apiFetch("/api/admin/access-requests", {
    method: "POST",
    body: JSON.stringify({ user_id: userId, text }),
  });
}

/** Виправити текст звернення: автор лишається тим, хто його написав. */
export async function updateAccessRequest(id: number, text: string): Promise<void> {
  await apiFetch("/api/admin/access-requests/update", {
    method: "POST",
    body: JSON.stringify({ id, text }),
  });
}

/** Прибрати звернення. */
export async function deleteAccessRequest(id: number): Promise<void> {
  await apiFetch(`/api/admin/access-requests?id=${id}`, { method: "DELETE" });
}
