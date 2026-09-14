import type { Env } from "../types/env";

function encodeText(text: string): string {
  return encodeURIComponent(text).replace(/'/g, "%27").replace(/"/g, "%22");
}

/**
 * Генерує Cloudinary-банер (синій фон + білий текст) для випадків,
 * коли в сценарію ще не вказано готове photo_url.
 * Текстом на банері тепер виступає сам slug (наприклад "main",
 * "galyashop"), а не окреме поле photo_title — його більше нема в БД.
 */
async function generateFallbackPhoto(slug: string, env: Env): Promise<string> {
  const cloud = env.CLOUDINARY_CLOUD_NAME;
  const encodedTitle = encodeText(slug);

  const url =
    `https://res.cloudinary.com/${cloud}/image/upload/` +
    `w_600,h_420,c_fill,b_rgb:1a56db/` +
    `l_text:Arial_52_bold:${encodedTitle},co_white,c_fit,w_500/` +
    `fl_layer_apply,g_center/` +
    `placeholder.png`;

  console.log(`[Photo] Generated fallback Cloudinary URL for "${slug}":`, url);

  // Перевіряємо чи доступний URL (опціонально)
  try {
    const testResponse = await fetch(url, { method: "HEAD" });
    if (!testResponse.ok) {
      console.error(`[Photo] Cloudinary URL not accessible: ${testResponse.status}`);
    }
  } catch (error) {
    console.error(`[Photo] Error checking fallback photo for "${slug}":`, error);
  }

  return url;
}

/**
 * Повертає URL фото для рендеру екрану.
 *
 * Пріоритет:
 * 1. Якщо photoUrl з БД заданий (не порожній) — повертаємо його як є.
 *    Це готове посилання, вказане вручну в Google-таблиці сценаріїв.
 * 2. Якщо photoUrl порожній/відсутній — fallback: генеруємо банер
 *    через Cloudinary, де текстом на картинці є сам slug.
 */
export async function getPhoto(
  slug: string,
  photoUrl: string | null | undefined,
  env: Env,
): Promise<string> {
  if (photoUrl && photoUrl.trim() !== "") {
    return photoUrl.trim();
  }

  console.log(`[Photo] photo_url is empty for "${slug}", falling back to generated banner`);
  return generateFallbackPhoto(slug, env);
}
