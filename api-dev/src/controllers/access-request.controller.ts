/**
 * Прохання про допуск — те, що людина написала зі сторінки відмови.
 *
 * **Чому це ендпоїнт, а не лист у Telegram.** Відмова — це відповідь, а не
 * помилка, тож людина має десь сказати «запростіть мене», навіть не маючи
 * доступу до платформи. Це єдиний шлях поза гейтом допуску, який **пише**
 * (див. `PLATFORM_EXEMPT_PATHS`), тому він мусить бути максимально вузьким:
 * один рядок, без нічого іншого.
 *
 * **Підпис не обов'язковий, а `user_id` може бути `NULL`.** Сторінку відмови
 * бачить і той, хто відкрив Mini App без підпису; вимагати тут підпис означало
 * б відмовити людину в момент, коли їй уже відмовлено. `NULL` нічого не
 * відкриває — це просто «хтось без підпису», і рядок лишається видимим у панелі.
 *
 * **Межа тексту — тут, на сервері.** Клієнт не вирішує, що вміститься: правило
 * межі мусить бути одне (§7), тож надіслати довший рядок напрямом не можна.
 *
 * @module api-dev/src/controllers/access-request.controller
 */

import type { Env } from "../shared/types";
import { tryResolveUserId } from "../shared/identity";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { apiLog } from "../shared/logger";

/** Скільки символів приймаємо: одне прохання — це одне-два речення, не лист. */
export const ACCESS_REQUEST_MAX = 500;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** `POST /api/user/access-request` — `{ ok: true }`. */
export async function handleAccessRequest(request: Request, env: Env): Promise<Response> {
  const userId = await tryResolveUserId(request, env);

  let text = "";
  try {
    const body = (await request.json()) as { text?: unknown };
    if (typeof body.text === "string") text = body.text.trim().slice(0, ACCESS_REQUEST_MAX);
  } catch {
    // Порожнє або биле тіло — це не помилка запиту, а порожнє прохання:
    // воно не варте рядка в базі, тож кажемо «нічого не прийнято» (400).
    return json({ ok: false, error: "Порожнє повідомлення" }, 400);
  }

  if (!text) return json({ ok: false, error: "Порожнє повідомлення" }, 400);

  try {
    await ensureTables(env.DB, ["access_requests"]);
    await env.DB.prepare("INSERT INTO access_requests (user_id, text) VALUES (?, ?)")
      .bind(userId, text)
      .run();
  } catch (error: unknown) {
    // Не вдалося зберегти — не кажемо людині «написано», бо це була б брехня.
    apiLog.error("access request save failed", error);
    return json({ ok: false, error: "Не вдалося зберегти" }, 500);
  }

  return json({ ok: true });
}
