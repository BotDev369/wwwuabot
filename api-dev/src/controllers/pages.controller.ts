/**
 * Контролер сторінок, які створює людина.
 *
 * Дві поверхні, і різниця між ними принципова:
 *
 *   GET    /api/user/pages   — сторінки, які людина веде (разом із приватними)
 *   POST   /api/user/pages   — зберегти (без `id` — нова, з `id` — правка)
 *   DELETE /api/user/pages   — прибрати свою за номером (тільки власник)
 *   GET    /api/space/pages  — Простір: сторінки, які автори відкрили
 *
 * **Список — це «що я веду», а не «що я створив».** Адмін стоїть у
 * `scenarios.admin_ids` і отримує ту саму сторінку — разом із магазином,
 * товарами й замовленнями; ролі розрізняє сервіс (`pageRole`), а не цей файл:
 * склад адмінів лежить JSON-ом, і в `WHERE` його не висловити.
 *
 * Ідентичність береться **тільки** з підписаного `initData` (`resolveUserId`):
 * жоден заголовок чи параметр не називає автора (`AGENTS.md` §7). Простір
 * публічний — і це безпечно саме тому, що видимість відбирає **запит до бази**
 * (`PagesService.listPublished`), а не цей файл.
 *
 * Коди відповідей різні навмисно (правило з `docs/RECIPES.md` §1): зайнята
 * адреса — `409` (людина може обрати іншу), «немає» й «чуже» — **однаково**
 * `404`, бо різниця між ними сама сказала б, що чужа сторінка існує.
 *
 * @module api-dev/src/controllers/pages.controller
 */

import { validatePageDraft } from "@wwwuabot/shared/pages";
import { z } from "zod";
import type { Env } from "../shared/types";
import { readBody } from "../shared/body";
import { apiLog } from "../shared/logger";
import { resolveUserId } from "../shared/identity";
import { PagesService } from "../services/pages.service";

/**
 * Сторінка: зміст перевіряє спільне `validatePageDraft`, а `id` мусить бути
 * числом — ним вирішується «правка чи створення». Не-число відпадає цілому, щоб
 * замість правки не вийшла нова сторінка-дубль.
 */
const pageBody = z.object({ id: z.number().optional() }).passthrough();

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** `GET` / `POST` / `DELETE /api/user/pages` — власні сторінки. */
export async function handleUserPages(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const service = new PagesService(env);

  try {
    if (request.method === "GET") {
      return json({ ok: true, pages: await service.listManaged(identity.userId) });
    }

    if (request.method === "POST") {
      const parsed = await readBody(request, pageBody);
      if (!parsed.ok) return parsed.response;

      const validated = validatePageDraft(parsed.body);
      if (!validated.ok) return json({ ok: false, error: validated.message }, 400);

      const id = parsed.body.id;
      const outcome = await service.save(
        identity.userId,
        validated.value,
        typeof id === "number" && id > 0 ? id : undefined,
      );

      if (outcome.kind === "not_found") return json({ ok: false, error: "Not found" }, 404);
      if (outcome.kind === "address_taken") {
        return json({ ok: false, error: "Така адреса вже зайнята — оберіть іншу" }, 409);
      }

      return json({ ok: true, page: outcome.page });
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
    apiLog.error("Pages error", e);
    return json({ ok: false, error: "Не вдалося виконати дію" }, 500);
  }
}

/** `GET /api/space/pages` — сторінки, які автори відкрили. Без авторизації. */
export async function handleSpacePages(request: Request, env: Env): Promise<Response> {
  const limit = new URL(request.url).searchParams.get("limit");

  try {
    const pages = await new PagesService(env).listPublished(limit);
    return json({ ok: true, pages });
  } catch (e: unknown) {
    apiLog.error("Pages space error", e);
    return json({ ok: false, error: "Не вдалося завантажити сторінки" }, 500);
  }
}
