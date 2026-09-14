import type { Env } from "../types/env";
import { log } from "./debug";

function encodeText(text: string): string {
  return encodeURIComponent(text).replace(/'/g, "%27").replace(/"/g, "%22");
}

/**
 * Текст банера для сторінки без власної назви — головна має порожній `slug`,
 * і підпис на банері з неї взяти нічим.
 */
export const FALLBACK_BANNER_TITLE = "WWWUABot";

/**
 * Генерує Cloudinary-банер (синій фон + білий текст) для випадків,
 * коли в сценарію ще не вказано готове photo_url.
 *
 * Текст шару — адреса сторінки (`mydate`, `galyashop`), а не окреме поле
 * `photo_title`: такого поля в БД немає.
 *
 * Шар додається **лише коли є текст**. Порожній `l_text` Cloudinary відкидає,
 * і тоді `fl_layer_apply` лишається без шару — трансформація стає невалідною
 * і відповідає **400**. Для головної сторінки (порожній `slug`) це означало, що
 * `sendPhoto` падав і бот не показував нічого: виглядало як мовчазний збій,
 * хоч URL будувався «успішно».
 */
export function buildFallbackPhotoUrl(slug: string, cloudName: string): string {
  const base = `https://res.cloudinary.com/${cloudName}/image/upload/w_600,h_420,c_fill,b_rgb:1a56db`;
  const title = slug.trim() === "" ? FALLBACK_BANNER_TITLE : slug.trim();
  const layer = `l_text:Arial_52_bold:${encodeText(title)},co_white,c_fit,w_500/fl_layer_apply,g_center`;
  return `${base}/${layer}/placeholder.png`;
}

async function generateFallbackPhoto(slug: string, env: Env): Promise<string> {
  const url = buildFallbackPhotoUrl(slug, env.CLOUDINARY_CLOUD_NAME);
  log("PHOTO", "generated fallback banner", { slug, url });

  // Перевіряємо чи доступний URL (опціонально)
  try {
    const testResponse = await fetch(url, { method: "HEAD" });
    if (!testResponse.ok) {
      log("PHOTO", "fallback banner not accessible", { status: testResponse.status });
    }
  } catch (error) {
    log("PHOTO", "error checking fallback banner", { slug, error: String(error) });
  }

  return url;
}

/**
 * Повертає URL фото для рендеру екрану.
 *
 * Пріоритет:
 * 1. Якщо photoUrl з БД заданий (не порожній) — повертаємо його як є.
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

  log("PHOTO", "photo_url is empty, falling back to generated banner", { slug });
  return generateFallbackPhoto(slug, env);
}
