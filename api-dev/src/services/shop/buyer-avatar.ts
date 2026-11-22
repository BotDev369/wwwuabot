/**
 * Фото покупця: байти Telegram у R2, назовні — адреса шлюзу.
 *
 * Посилання Telegram старіє, тому зберігаємо байти. Будь-який збій — дефолтне
 * фото: замовлення не мусить падати через картинку.
 *
 * @module api-dev/src/services/shop/buyer-avatar
 */

import { mediaRandomToken, mediaUrl } from "@wwwuabot/shared/shop";
import type { Env } from "../../shared/types";
import { apiLog } from "../../shared/logger";

/** Заглушка з R2 — та сама, що для сторінок і товарів. */
export const DEFAULT_BUYER_PHOTO = mediaUrl("shop/defaults/buyer.jpg");

/** Стеля завантаження: аватар у Telegram менший, а зайве в пам'ять не тягнемо. */
const AVATAR_MAX_BYTES = 8 * 1024 * 1024;

interface TelegramPhotoSize {
  file_id: string;
}

interface TelegramAnswer<T> {
  ok?: boolean;
  result?: T;
}

/** Виклик Bot API; `null` — відмова або мережа, без винятку назовні. */
async function telegram<T>(
  token: string,
  method: string,
  body: Record<string, unknown>,
): Promise<T | null> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) return null;

    const answer = (await response.json()) as TelegramAnswer<T>;
    return answer.ok ? (answer.result ?? null) : null;
  } catch (error: unknown) {
    apiLog.error("Telegram avatar call error", error);
    return null;
  }
}

/**
 * Адреса фото покупця: свіже з Telegram, інакше дефолтне.
 *
 * `getUserProfilePhotos` віддає розміри від меншого до більшого, тож беремо
 * останній — картка покупця показує його досить великим.
 */
export async function buyerAvatar(env: Env, userId: number): Promise<string> {
  const token = env.BOT_TOKEN;
  const bucket = env.SHOP_MEDIA;
  if (!token || !bucket) return DEFAULT_BUYER_PHOTO;

  try {
    const photos = await telegram<{ photos?: TelegramPhotoSize[][] }>(
      token,
      "getUserProfilePhotos",
      { user_id: userId, limit: 1 },
    );
    const sizes = photos?.photos?.[0];
    const largest = sizes?.[sizes.length - 1];
    if (!largest?.file_id) return DEFAULT_BUYER_PHOTO;

    const file = await telegram<{ file_path?: string }>(token, "getFile", {
      file_id: largest.file_id,
    });
    if (!file?.file_path) return DEFAULT_BUYER_PHOTO;

    const response = await fetch(`https://api.telegram.org/file/bot${token}/${file.file_path}`);
    if (!response.ok) return DEFAULT_BUYER_PHOTO;

    const bytes = await response.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength > AVATAR_MAX_BYTES) return DEFAULT_BUYER_PHOTO;

    const key = `shop/avatars/${userId}-${mediaRandomToken()}.jpg`;
    await bucket.put(key, bytes, {
      httpMetadata: {
        contentType: response.headers.get("content-type") ?? "image/jpeg",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
    return mediaUrl(key);
  } catch (error: unknown) {
    apiLog.error("Buyer avatar error", error);
    return DEFAULT_BUYER_PHOTO;
  }
}
