/**
 * Сценарії, які веде людина, — **лише читання**.
 *
 *   GET /api/user/pages — сценарії, які людина бачить (разом із приватними)
 *
 * **Сторінку не створює й не править ніхто з інтерфейсу.** Її заводить
 * платформа: код і міграції. Тому `POST` і `DELETE` тут не «заборонені для
 * цієї ролі», а **не існують** — відповідь `405` каже саме це, і жоден шлях не
 * лишає по собі запису в базі.
 *
 * Ідентичність береться **тільки** з підписаного `initData` (`resolveUserId`):
 * жоден заголовок чи параметр не називає автора (`AGENTS.md` §7).
 *
 * @module api-dev/src/controllers/pages.controller
 */

import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { resolveUserId } from "../shared/identity";
import { resolveTenant } from "../shared/tenant";
import { PagesService } from "../services/pages.service";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** `GET /api/user/pages` — сценарії, які людина бачить. Решта методів — `405`. */
export async function handleUserPages(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const tenant = await resolveTenant(request, env);
  if (!tenant.ok) return tenant.response;

  try {
    return json({
      ok: true,
      pages: await new PagesService(env, tenant.tenant.id).listManaged(identity.userId),
    });
  } catch (e: unknown) {
    apiLog.error("Pages error", e);
    return json({ ok: false, error: "Не вдалося виконати дію" }, 500);
  }
}
