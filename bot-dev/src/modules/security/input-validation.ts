import { log } from "../../shared/utils/debug";

/**
 * Валідація та санітизація вводу користувача.
 *
 * Межі (налаштовувані):
 * - TEXT_MAX_LENGTH: 1000 символів для вільного тексту
 * - TEXT_HARD_LIMIT: 4000 символів (обмеження Telegram caption)
 * - SLUG_MAX_LENGTH: 64 символи
 */

const TEXT_MAX_LENGTH = 1000;
const TEXT_HARD_LIMIT = 4000;
const SLUG_MAX_LENGTH = 64;

/** Допустимі символи для slug (lowercase letters, digits, hyphen) */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Валідує та обрізає текст користувача.
 * Повертає `null` якщо текст невалідний (занадто довгий, порожній).
 */
export function validateUserText(text: string): string | null {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    log("SEC:validation", "empty text rejected");
    return null;
  }

  if (trimmed.length > TEXT_HARD_LIMIT) {
    log("SEC:validation", "text exceeds hard limit", {
      length: trimmed.length,
      limit: TEXT_HARD_LIMIT,
    });
    return null;
  }

  // Обрізаємо до TEXT_MAX_LENGTH
  const result = trimmed.substring(0, TEXT_MAX_LENGTH);

  if (result.length < trimmed.length) {
    log("SEC:validation", "text truncated", {
      original: trimmed.length,
      truncated: result.length,
    });
  }

  return result;
}

/**
 * Валідує slug (з deep link або callback_data).
 * Повертає `null` якщо невалідний.
 */
export function validateSlug(slug: string): string | null {
  const trimmed = slug.trim();

  if (trimmed.length === 0 || trimmed.length > SLUG_MAX_LENGTH) {
    log("SEC:validation", "slug invalid length", { length: trimmed.length });
    return null;
  }

  if (!SLUG_RE.test(trimmed)) {
    log("SEC:validation", "slug invalid characters", {
      slug: trimmed.substring(0, 20),
    });
    return null;
  }

  return trimmed;
}

/**
 * Санітизація HTML-тегів у тексті перед відправкою з parse_mode: "HTML".
 * Екранує < > & щоб користувацький контент не зламав розмітку.
 *
 * ВАЖЛИВО: використовувати ТІЛЬКИ для caption користувача.
 * Не застосовувати до контенту з БД (сценарії) — там адмін контролює HTML.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
