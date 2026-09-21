/**
 * Контролер оголошень: своя дошка й спільна.
 *
 * Дві поверхні, і різниця між ними принципова:
 *
 *   GET    /api/user/ads   — власні оголошення (разом із чернетками)
 *   POST   /api/user/ads   — зберегти своє (без `id` — нове, з `id` — правка)
 *   DELETE /api/user/ads   — прибрати своє за номером
 *   GET    /api/space/ads  — дошка: показане іншими, без авторизації
 *
 * Ідентичність береться **тільки** з підписаного `initData` (`resolveUserId`):
 * жоден заголовок чи параметр не називає власника (AGENTS.md §7). Дошка
 * публічна — і це безпечно саме тому, що видимість відбирає **запит до бази**
 * (`AdsService.board`), а не цей файл.
 *
 * @module api-dev/src/controllers/ads.controller
 */

import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { resolveUserId } from "../shared/identity";
import { validateAd } from "@wwwuabot/shared/ads";
import { AdsService } from "../services/ads.service";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * `GET` / `POST` / `DELETE /api/user/ads` — власні оголошення.
 *
 * Перевірка форми (`validateAd`) стоїть **перед** записом, і її правила спільні
 * з композером: поле не дає набрати те, що сервер потім обріже мовчки.
 */
export async function handleUserAds(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const service = new AdsService(env);

  try {
    if (request.method === "GET") {
      return json({ ok: true, ads: await service.listOwn(identity.userId) });
    }

    if (request.method === "POST") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "Invalid JSON" }, 400);
      }

      const validated = validateAd(body);
      if (!validated.ok) return json({ ok: false, error: validated.message }, 400);

      const id = Number((body as { id?: unknown }).id);
      const ad = await service.save(
        identity.userId,
        validated.value,
        Number.isInteger(id) && id > 0 ? id : undefined,
      );
      // Немає рядка або він чужий — **однакова** відповідь: код відповіді теж
      // сказав би, що чуже оголошення існує (AGENTS.md §7).
      if (!ad) return json({ ok: false, error: "Not found" }, 404);

      return json({ ok: true, ad });
    }

    if (request.method === "DELETE") {
      const id = Number(new URL(request.url).searchParams.get("id"));
      if (!Number.isInteger(id) || id <= 0) {
        return json({ ok: false, error: "Missing id" }, 400);
      }

      const removed = await service.remove(id, identity.userId);
      if (!removed) return json({ ok: false, error: "Not found" }, 404);
      return json({ ok: true, id });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e: unknown) {
    apiLog.error("Ads error", e);
    return json({ ok: false, error: "Не вдалося виконати дію" }, 500);
  }
}

/** `GET /api/space/ads` — дошка: те, що інші показали. Без авторизації. */
export async function handleSpaceAds(request: Request, env: Env): Promise<Response> {
  const limit = new URL(request.url).searchParams.get("limit");

  try {
    const ads = await new AdsService(env).board(limit);
    return json({ ok: true, ads });
  } catch (e: unknown) {
    apiLog.error("Ads board error", e);
    return json({ ok: false, error: "Не вдалося завантажити дошку" }, 500);
  }
}
