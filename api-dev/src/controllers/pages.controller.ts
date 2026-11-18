/**
 * Контролер сторінок — **лише читання**.
 *
 *   GET /api/user/pages    — сторінки, які людина бачить (разом із приватними)
 *   GET /api/public/pages  — сторінки, які автори відкрили
 *
 * **Сторінку не створює й не править ніхто з інтерфейсу.** Її заводить
 * платформа: код і міграції. Тому `POST` і `DELETE` тут не «заборонені для
 * цієї ролі», а **не існують** — відповідь `405` каже саме це, і жоден шлях не
 * лишає по собі запису в базі.
 *
 * Ідентичність береться **тільки** з підписаного `initData` (`resolveUserId`):
 * жоден заголовок чи параметр не називає автора (`AGENTS.md` §7). Відкритий
 * список публічний — і це безпечно саме тому, що видимість відбирає **запит до
 * бази** (`PagesService.listPublished`), а не цей файл.
 *
 * @module api-dev/src/controllers/pages.controller
 */

import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { resolveUserId } from "../shared/identity";
import { PagesService } from "../services/pages.service";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** `GET /api/user/pages` — сторінки, які людина бачить. Решта методів — `405`. */
export async function handleUserPages(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  try {
    return json({ ok: true, pages: await new PagesService(env).listManaged(identity.userId) });
  } catch (e: unknown) {
    apiLog.error("Pages error", e);
    return json({ ok: false, error: "Не вдалося виконати дію" }, 500);
  }
}

/** `GET /api/public/pages` — сторінки, які автори відкрили. Без авторизації. */
export async function handlePublicPages(request: Request, env: Env): Promise<Response> {
  const limit = new URL(request.url).searchParams.get("limit");

  try {
    const pages = await new PagesService(env).listPublished(limit);
    return json({ ok: true, pages });
  } catch (e: unknown) {
    apiLog.error("Public pages error", e);
    return json({ ok: false, error: "Не вдалося завантажити сторінки" }, 500);
  }
}
