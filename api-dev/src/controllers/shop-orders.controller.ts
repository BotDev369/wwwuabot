/**
 * Контролер замовлень магазину.
 *
 *   GET  /api/user/shop/orders        — замовлення свого магазину (за `shop`)
 *   POST /api/user/shop/orders/status — поставити статус замовленню свого магазину
 *   GET  /api/user/shop/statuses      — статуси магазину (типові з його правками)
 *   POST /api/space/shop/orders       — **замовити** у відкритому магазині за адресою
 *
 * **Покупець — із підписаного `initData`, як і скрізь** (`resolveUserId`):
 * ні заголовка, ні параметра, який би називав покупця, тут немає (`AGENTS.md`
 * §7). Номер магазину, навпаки, приходить від клієнта — тому право продавця
 * перевіряє **сервіс** умовою в запиті, а не цей файл.
 *
 * **Замовляти можна без продавського номера магазину, і це не послаблення.**
 * Покупцеві відомий лише **хвіст адреси** (`/<магазин>`), і саме його він
 * надсилає: адресу перекладає в номер запит до бази, який одночасно відсіює
 * чуже й закрите (`publicShopBySlug`).
 *
 * **Читання замовлень — поки що лише продавське.** Свої покупки покупець
 * бачить у розмові, яку відкрило замовлення (§8), а власного списку покупок
 * ще немає — і шлях для нього не заводимо, доки немає екрана
 * (`docs/SHOPS.md` §10).
 *
 * @module api-dev/src/controllers/shop-orders.controller
 */

import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { resolveUserId } from "../shared/identity";
import { ShopOrdersService } from "../services/shop/orders.service";

/** Текст невдачі — без подробиць: у винятку бувають назви таблиць і значення. */
const FAILURE = "Не вдалося виконати дію";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Номер із запиту (магазин, замовлення): ціле, більше за нуль. */
function positiveId(raw: unknown): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * `GET` / `POST /api/user/shop/orders` — замовлення магазину й зміна статусу.
 *
 * Номер магазину приходить від клієнта, тож право продавця перевіряє сервіс
 * умовою в запиті (`ownShopId`) — «немає» й «чуже» тут нерозрізненні навмисно.
 */
export async function handleUserShopOrders(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const service = new ShopOrdersService(env);

  try {
    if (request.method === "GET") {
      // Шлях зміни статусу читати нічого: інакше `GET …/orders/status` тихо
      // віддавав би список замовлень під адресою, яка обіцяє інше.
      if (new URL(request.url).pathname.endsWith("/status")) {
        return json({ ok: false, error: "Method not allowed" }, 405);
      }

      const shopId = positiveId(new URL(request.url).searchParams.get("shop"));
      if (shopId === null) return json({ ok: false, error: "Missing shop" }, 400);

      const orders = await service.listOwn(shopId, identity.userId);
      if (orders === null) return json({ ok: false, error: "Not found" }, 404);
      return json({ ok: true, orders });
    }

    if (request.method === "POST") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "Invalid JSON" }, 400);
      }

      const source = (typeof body === "object" && body !== null ? body : {}) as Record<
        string,
        unknown
      >;
      const shopId = positiveId(source.shop);
      const orderId = positiveId(source.id);
      if (shopId === null || orderId === null) return json({ ok: false, error: "Missing id" }, 400);

      const outcome = await service.setStatus(shopId, identity.userId, orderId, source.status);
      if (outcome.kind === "not_found") return json({ ok: false, error: "Not found" }, 404);
      if (outcome.kind === "rejected") return json({ ok: false, error: outcome.message }, 400);

      return json({ ok: true, order: outcome.order });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e: unknown) {
    apiLog.error("Shop orders error", e);
    return json({ ok: false, error: FAILURE }, 500);
  }
}

/** `GET /api/user/shop/statuses` — статуси свого магазину. */
export async function handleUserShopStatuses(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const shopId = positiveId(new URL(request.url).searchParams.get("shop"));
  if (shopId === null) return json({ ok: false, error: "Missing shop" }, 400);

  try {
    const statuses = await new ShopOrdersService(env).statuses(shopId, identity.userId);
    if (statuses === null) return json({ ok: false, error: "Not found" }, 404);
    return json({ ok: true, statuses });
  } catch (e: unknown) {
    apiLog.error("Shop statuses error", e);
    return json({ ok: false, error: FAILURE }, 500);
  }
}

/**
 * `POST /api/space/shop/orders` — прийняти замовлення.
 *
 * Без авторизації за номером магазину, але **не без покупця**: ідентичність
 * потрібна, щоб замовлення було кому показати й кому відповісти. Видимість
 * магазину при цьому відбирає запит до бази (`publicShopBySlug`), а не цей файл.
 */
export async function handleSpaceShopOrders(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const slug = (new URL(request.url).searchParams.get("shop") ?? "").trim();
  if (!slug) return json({ ok: false, error: "Missing shop" }, 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Invalid JSON" }, 400);
  }

  try {
    const outcome = await new ShopOrdersService(env).place(slug, identity.userId, body);
    if (outcome.kind === "not_found") return json({ ok: false, error: "Not found" }, 404);
    if (outcome.kind === "rejected") return json({ ok: false, error: outcome.message }, 400);
    return json({ ok: true, order: outcome.order });
  } catch (e: unknown) {
    apiLog.error("Shop order place error", e);
    return json({ ok: false, error: "Не вдалося надіслати замовлення" }, 500);
  }
}
