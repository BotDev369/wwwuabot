/**
 * Контролер товарів магазину.
 *
 *   GET    /api/user/shop/products   — власні товари (разом із чернетками)
 *   POST   /api/user/shop/products   — зберегти свій (без `id` — новий)
 *   DELETE /api/user/shop/products   — прибрати свій за номером
 *   GET    /api/space/shop/products  — каталог **відкритого** магазину
 *
 * Ідентичність береться **тільки** з підписаного `initData` (`resolveUserId`):
 * жоден заголовок чи параметр не називає продавця (`AGENTS.md` §7). Номер
 * магазину, навпаки, приходить від клієнта — тому право продавця перевіряє
 * **сервіс**, умовою в запиті, а не цей файл.
 *
 * Коди відповідей різні навмисно (правило з `docs/RECIPES.md` §1): зайнята
 * адреса — `409` (людина обере іншу), «немає» й «чуже» — **однаково** `404`,
 * бо різниця між ними сама сказала б, що чужий магазин існує.
 *
 * @module api-dev/src/controllers/shop.controller
 */

import { validateProductDraft } from "@wwwuabot/shared/shop";
import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { resolveUserId } from "../shared/identity";
import { ShopProductsService } from "../services/shop/products.service";

/** Текст невдачі — без подробиць: у винятку бувають назви таблиць і значення. */
const FAILURE = "Не вдалося виконати дію";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Номер магазину з запиту: ціле, більше за нуль. */
function shopIdOf(params: URLSearchParams): number | null {
  const id = Number(params.get("shop"));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** `GET` / `POST` / `DELETE /api/user/shop/products` — власні товари. */
export async function handleUserShopProducts(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const params = new URL(request.url).searchParams;
  const shopId = shopIdOf(params);
  if (shopId === null) return json({ ok: false, error: "Missing shop" }, 400);

  const service = new ShopProductsService(env);

  try {
    if (request.method === "GET") {
      const data = await service.listOwn(shopId, identity.userId);
      if (!data) return json({ ok: false, error: "Not found" }, 404);
      return json({ ok: true, products: data.products, media: data.media });
    }

    if (request.method === "POST") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "Invalid JSON" }, 400);
      }

      const validated = validateProductDraft(body);
      if (!validated.ok) return json({ ok: false, error: validated.message }, 400);

      const id = Number((body as { id?: unknown }).id);
      const outcome = await service.save(
        shopId,
        identity.userId,
        validated.value,
        Number.isInteger(id) && id > 0 ? id : undefined,
      );

      if (outcome.kind === "not_found") return json({ ok: false, error: "Not found" }, 404);
      if (outcome.kind === "address_taken") {
        return json({ ok: false, error: "Така адреса товару вже зайнята — оберіть іншу" }, 409);
      }

      return json({ ok: true, product: outcome.product, media: outcome.media });
    }

    if (request.method === "DELETE") {
      const id = Number(params.get("id"));
      if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "Missing id" }, 400);

      const removed = await service.remove(shopId, identity.userId, id);
      if (!removed) return json({ ok: false, error: "Not found" }, 404);
      return json({ ok: true, id });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e: unknown) {
    apiLog.error("Shop products error", e);
    return json({ ok: false, error: FAILURE }, 500);
  }
}

/**
 * `GET /api/space/shop/products` — каталог магазину за його адресою.
 *
 * Без авторизації, і це безпечно саме тому, що видимість магазину й товарів
 * відбирає **запит до бази** (`publicShopBySlug`, `is_active = 1`), а не цей
 * файл. Закритий магазин не дістається каталогом — та сама межа, що в
 * сторінок і оголошень.
 */
export async function handleSpaceShopProducts(request: Request, env: Env): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const slug = (params.get("shop") ?? "").trim();
  if (!slug) return json({ ok: false, error: "Missing shop" }, 400);

  try {
    const data = await new ShopProductsService(env).catalog(slug, params.get("limit"));
    if (!data) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, products: data.products, media: data.media });
  } catch (e: unknown) {
    apiLog.error("Shop catalog error", e);
    return json({ ok: false, error: "Не вдалося завантажити каталог" }, 500);
  }
}
