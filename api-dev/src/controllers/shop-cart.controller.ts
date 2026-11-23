/**
 * Кошик покупця: `GET`, `PUT`, `DELETE /api/user/shop/cart`. Покупець — лише з
 * підписаного `initData`, магазин — адресою. `PUT` ставить `qty` або додає
 * `delta`, `DELETE` без `productId` очищає кошик.
 *
 * @module api-dev/src/controllers/shop-cart.controller
 */

import { ORDER_QTY_MAX } from "@wwwuabot/shared/shop";
import { z } from "zod";
import type { Env } from "../shared/types";
import { readBody } from "../shared/body";
import { apiLog } from "../shared/logger";
import { resolveUserId } from "../shared/identity";
import { ShopCartService } from "../services/shop/cart.service";

const FAILURE = "Не вдалося виконати дію з кошиком";

const cartBody = z.object({
  productId: z.number().int().positive(),
  qty: z.number().int().min(0).max(ORDER_QTY_MAX).optional(),
  delta: z.number().int().min(-ORDER_QTY_MAX).max(ORDER_QTY_MAX).optional(),
});

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function shopSlugOf(request: Request): string {
  return (new URL(request.url).searchParams.get("shop") ?? "").trim();
}

export async function handleUserShopCart(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const slug = shopSlugOf(request);
  if (!slug) return json({ ok: false, error: "Missing shop" }, 400);

  const service = new ShopCartService(env);

  try {
    if (request.method === "GET") {
      const outcome = await service.read(slug, identity.userId);
      if (outcome.kind === "not_found") return json({ ok: false, error: "Not found" }, 404);
      if (outcome.kind !== "ok") return json({ ok: false, error: FAILURE }, 400);
      return json({ ok: true, lines: outcome.lines });
    }

    if (request.method === "PUT") {
      const parsed = await readBody(request, cartBody);
      if (!parsed.ok) return parsed.response;

      const { productId, qty, delta } = parsed.body;
      if ((qty === undefined) === (delta === undefined)) {
        return json({ ok: false, error: "Очікується qty або delta" }, 400);
      }

      const outcome = await service.change(slug, identity.userId, { productId, qty, delta });
      if (outcome.kind === "not_found") return json({ ok: false, error: "Not found" }, 404);
      if (outcome.kind === "rejected") return json({ ok: false, error: outcome.message }, 400);
      return json({ ok: true, lines: outcome.lines });
    }

    if (request.method === "DELETE") {
      const raw = new URL(request.url).searchParams.get("productId");
      if (raw !== null) {
        const productId = Number(raw);
        if (!Number.isInteger(productId) || productId <= 0) {
          return json({ ok: false, error: "Missing productId" }, 400);
        }
        const outcome = await service.change(slug, identity.userId, { productId, qty: 0 });
        if (outcome.kind === "not_found") return json({ ok: false, error: "Not found" }, 404);
        if (outcome.kind === "rejected") return json({ ok: false, error: outcome.message }, 400);
        return json({ ok: true, lines: outcome.lines });
      }

      const outcome = await service.clear(slug, identity.userId);
      if (outcome.kind === "not_found") return json({ ok: false, error: "Not found" }, 404);
      return json({ ok: true, lines: outcome.kind === "ok" ? outcome.lines : [] });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e: unknown) {
    apiLog.error("Shop cart error", e);
    return json({ ok: false, error: FAILURE }, 500);
  }
}
