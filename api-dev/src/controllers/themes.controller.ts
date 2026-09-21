/**
 * Контролер схем теми: власна бібліотека й спільна.
 *
 *   GET    /api/user/themes   — власні схеми (разом із закритими)
 *   POST   /api/user/themes   — зберегти свою (без `id` — нова, з `id` — правка)
 *   DELETE /api/user/themes   — прибрати свою за номером
 *   GET    /api/space/themes  — спільна бібліотека: те, що інші відкрили
 *
 * Ідентичність береться **тільки** з підписаного `initData` (`resolveUserId`):
 * жоден заголовок чи параметр не називає власника (AGENTS.md §7). Спільна
 * бібліотека публічна — і це безпечно саме тому, що видимість відбирає **запит
 * до бази** (`ThemesService.listShared`), а не цей файл.
 *
 * @module api-dev/src/controllers/themes.controller
 */

import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { resolveUserId } from "../shared/identity";
import { validateThemeScheme } from "@wwwuabot/shared/themes";
import { ThemesService } from "../services/themes.service";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * `GET` / `POST` / `DELETE /api/user/themes` — власні схеми.
 *
 * Перевірка (`validateThemeScheme`) стоїть **перед** записом, і її правила
 * спільні з формою: поле не дає зберегти те, що сервер потім обріже мовчки.
 */
export async function handleUserThemes(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const service = new ThemesService(env);

  try {
    if (request.method === "GET") {
      return json({ ok: true, themes: await service.listOwn(identity.userId) });
    }

    if (request.method === "POST") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "Invalid JSON" }, 400);
      }

      const validated = validateThemeScheme(body);
      if (!validated.ok) return json({ ok: false, error: validated.message }, 400);

      const theme = await service.save(identity.userId, validated.value, validated.value.id);
      // Немає рядка або він чужий — **однакова** відповідь: код відповіді теж
      // сказав би, що чужа схема існує (AGENTS.md §7).
      if (!theme) return json({ ok: false, error: "Not found" }, 404);

      return json({ ok: true, theme });
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
    apiLog.error("Themes error", e);
    return json({ ok: false, error: "Не вдалося виконати дію" }, 500);
  }
}

/** `GET /api/space/themes` — спільна бібліотека. Без авторизації. */
export async function handleSpaceThemes(request: Request, env: Env): Promise<Response> {
  const limit = new URL(request.url).searchParams.get("limit");

  try {
    const themes = await new ThemesService(env).listShared(limit);
    return json({ ok: true, themes });
  } catch (e: unknown) {
    apiLog.error("Themes library error", e);
    return json({ ok: false, error: "Не вдалося завантажити бібліотеку" }, 500);
  }
}
