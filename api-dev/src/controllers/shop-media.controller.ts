/**
 * Контролер файлів магазину й **єдиний шлюз** до них.
 *
 *   GET    /api/user/shop/media   — власна бібліотека (номери, розміри, ключі)
 *   POST   /api/user/shop/media   — завантажити фото (multipart: `shop`, `file`)
 *   DELETE /api/user/shop/media   — прибрати свій файл
 *   GET    /api/shop/media/<…>    — **сам файл**, без авторизації
 *
 * Дві поверхні в одному файлі тому, що це один факт: файл віддають тим самим
 * ключем, яким його записали. Розділити їх означало б тримати одну межу
 * (`SHOP_MEDIA` — бакет магазину) у двох місцях.
 *
 * **Файл віддає `api-dev`, і публічний доступ у бакета вимкнено навмисно**
 * (`docs/SHOPS.md` §5): адреса невгадувана (у ключі випадкова частка), а
 * правило «звідки береться файл» лишається одне. Фото читають Telegram і веб
 * **без** `initData` — тому цей шлях і стоїть у публічній групі роутера.
 *
 * @module api-dev/src/controllers/shop-media.controller
 */

import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { resolveUserId } from "../shared/identity";
import { ShopMediaService } from "../services/shop/media.service";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Номер магазину з запиту: ціле, більше за нуль. */
function shopIdOf(raw: unknown): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** `GET` / `POST` / `DELETE /api/user/shop/media` — власні файли магазину. */
export async function handleUserShopMedia(request: Request, env: Env): Promise<Response> {
  const identity = await resolveUserId(request, env);
  if (!identity.ok) return identity.response;

  const service = new ShopMediaService(env);

  try {
    if (request.method === "POST") return await acceptUpload(request, identity.userId, service);

    const shopId = shopIdOf(new URL(request.url).searchParams.get("shop"));
    if (shopId === null) return json({ ok: false, error: "Missing shop" }, 400);

    if (request.method === "GET") {
      const media = await service.listOwn(shopId, identity.userId);
      if (!media) return json({ ok: false, error: "Not found" }, 404);
      return json({ ok: true, media });
    }

    if (request.method === "DELETE") {
      const id = Number(new URL(request.url).searchParams.get("id"));
      if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "Missing id" }, 400);

      const removed = await service.remove(shopId, identity.userId, id);
      if (!removed) return json({ ok: false, error: "Not found" }, 404);
      return json({ ok: true, id });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e: unknown) {
    apiLog.error("Shop media error", e);
    return json({ ok: false, error: "Не вдалося виконати дію" }, 500);
  }
}

/**
 * Приймання завантаження з multipart-форми.
 *
 * Форма, а не тіло з байтами, бо поруч із файлом їде **номер магазину**: без
 * нього файл не має власника, а з query-параметра його можна було б підмінити
 * непомітно серед решти тіла.
 */
async function acceptUpload(
  request: Request,
  ownerId: number,
  service: ShopMediaService,
): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: "Очікується форма з файлом" }, 400);
  }

  const shopId = shopIdOf(form.get("shop"));
  if (shopId === null) return json({ ok: false, error: "Missing shop" }, 400);

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return json({ ok: false, error: "Файл не додано" }, 400);
  }

  const outcome = await service.upload(shopId, ownerId, file);

  if (outcome.kind === "unavailable") {
    return json({ ok: false, error: "Сховище файлів не налаштоване" }, 503);
  }
  if (outcome.kind === "rejected") return json({ ok: false, error: outcome.message }, 400);
  if (outcome.kind === "not_found") return json({ ok: false, error: "Not found" }, 404);

  // У відповіді — рядок обліку (`ShopMedia`): у ньому ключ, а не адреса.
  // Адресу будує той, хто показує (`mediaUrl`) — так вона переживе зміну шлюзу.
  return json({ ok: true, media: outcome.media });
}

/**
 * `GET /api/shop/media/<ключ>` — байти файлу.
 *
 * Ключ приходить із адреси цілком (він містить слеші), і його форму перевіряє
 * сервіс. `Cache-Control: immutable` — не прикраса: ключ видається разом із
 * завантаженням і не змінюється ніколи, тож повторне питання про той самий файл
 * завжди дало б ту саму відповідь.
 */
export async function handleShopMediaFile(env: Env, key: string): Promise<Response> {
  try {
    const object = await new ShopMediaService(env).read(key);
    if (!object) return new Response("Not Found", { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/octet-stream");

    return new Response(object.body, { headers });
  } catch (e: unknown) {
    apiLog.error("Shop media read error", e);
    return new Response("Internal error", { status: 500 });
  }
}
