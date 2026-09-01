import { log } from "../../shared/utils/debug";

/**
 * Валідація та санітизація вводу користувача.
 *
 * Межі (налаштовувані):
 * - TEXT_MAX_LENGTH: 1000 символів для вільного тексту
 * - TEXT_HARD_LIMIT: 4000 символів (обмеження Telegram caption)
 * - CODEWORD_MAX_LENGTH: 64 символи
 */

const TEXT_MAX_LENGTH = 1000;
const TEXT_HARD_LIMIT = 4000;
const CODEWORD_MAX_LENGTH = 64;

/** Допустимі символи для codeword (letter, digit, underscore, hyphen) */
const CODEWORD_RE = /^[a-zA-Z0-9_-]+$/;

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
 * Валідує codeword (з deep link або callback_data).
 * Повертає `null` якщо невалідний.
 */
export function validateCodeword(codeword: string): string | null {
  const trimmed = codeword.trim();

  if (trimmed.length === 0 || trimmed.length > CODEWORD_MAX_LENGTH) {
    log("SEC:validation", "codeword invalid length", { length: trimmed.length });
    return null;
  }

  if (!CODEWORD_RE.test(trimmed)) {
    log("SEC:validation", "codeword invalid characters", {
      codeword: trimmed.substring(0, 20),
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
