/**
 * Прохання, яке людині лишилося від платформи, — «написати адміну».
 *
 * **Чому це ендпоїнт, а не лист у Telegram.** Відмова — це відповідь, а не
 * помилка, тож людина мусить мати десь сказати «ось моє питання», навіть не
 * маючи доступу до платформи. Це єдиний шлях поза гейтом допуску, який **пише**
 * (див. `PLATFORM_EXEMPT_PATHS`), тому він мусить бути максимально вузьким:
 * один рядок, без нічого іншого.
 *
 * **Підпис обов'язковий, і це не бюрократія, а різниця у сенсі.** Сторінка
 * відмови тепер видчна **лише** людині з підписаним `initData` (поза ботом
 * платформа не відкривається взагалі — див. `web-platform-dev/src/app/AuthGate.tsx`), тож
 * рядок без `user_id` уже не має змісту: це не «хтось без підпису», а запит
 * поза платформою, який треба відкинути (401), а не зберегти.
 *
 * **Правило тексту спільне** (`@wwwuabot/shared/access-requests`): і прийом
 * тут, і редагування в панелі за однією межею, тож «можна ввести» й «можна
 * зберегти» не розходяться.
 *
 * @module api-dev/src/controllers/access-request.controller
 */

import type { Env } from "../shared/types";
import { resolveUserId } from "../shared/identity";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { sanitizeAccessRequestText } from "@wwwuabot/shared/access-requests";
import { apiLog } from "../shared/logger";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** `POST /api/user/access-request` — `{ ok: true }`. */
export async function handleAccessRequest(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  let text: string;
  try {
    const body = (await request.json()) as { text?: unknown };
    text = sanitizeAccessRequestText(body.text);
  } catch {
    // Порожнє або биле тіло — це не помилка запиту, а порожнє повідомлення:
    // воно не варте рядка в базі, тож кажемо «нічого не прийнято» (400).
    return json({ ok: false, error: "Порожнє повідомлення" }, 400);
  }

  if (!text) return json({ ok: false, error: "Порожнє повідомлення" }, 400);

  try {
    await ensureTables(env.DB, ["access_requests"]);
    await env.DB.prepare("INSERT INTO access_requests (user_id, text) VALUES (?, ?)")
      .bind(identity.userId, text)
      .run();
  } catch (error: unknown) {
    // Не вдалося зберегти — не кажемо людині «написано», бо це була б брехня.
    apiLog.error("access request save failed", error);
    return json({ ok: false, error: "Не вдалося зберегти" }, 500);
  }

  return json({ ok: true });
}
