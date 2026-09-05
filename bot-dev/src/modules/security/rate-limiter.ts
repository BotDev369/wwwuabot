import type { AppContext } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";

/**
 * Rate limiter — зберігає дані в колонці `rate_limit_json` таблиці `users`.
 *
 * Логіка:
 * - Кожен апдейт = +1 до лічильника поточного вікна (60с)
 * - Якщо лічильник > LIMIT → тихо ігноруємо
 * - Якщо violations > AUTO_BLOCK_THRESHOLD за 5 хв → автоблокування
 *
 * Ціни (налаштовувані):
 * - LIMIT_PER_MINUTE: 60 апдейтів/хв на користувача
 * - AUTO_BLOCK_THRESHOLD: 10 порушень за 5 хв → is_blocked = 1
 */

const LIMIT_PER_MINUTE = 60;
const AUTO_BLOCK_THRESHOLD = 10;
const WINDOW_SECONDS = 60;
const VIOLATION_WINDOW_SECONDS = 300; // 5 хв

interface RateLimitData {
  /** Поточне вікно: [timestamp_початок_вікна, кількість_запитів] */
  window: [number, number];
  /** Порушення за останні 5 хв: [[timestamp, ...], ...] */
  violations: number[];
}

/**
 * Перевіряє rate limit для користувача.
 * Повертає `true` якщо запит дозволено, `false` якщо перевищено ліміт.
 */
export function checkRateLimit(ctx: AppContext): boolean {
  if (!ctx.user) return true;

  const now = Math.floor(Date.now() / 1000);
  const currentWindowStart = Math.floor(now / WINDOW_SECONDS) * WINDOW_SECONDS;

  // Парсимо існуючі дані
  let data: RateLimitData = { window: [0, 0], violations: [] };
  try {
    const raw = ctx.user.rate_limit_json;
    if (raw) {
      data = typeof raw === "string" ? JSON.parse(raw) : (raw as unknown as RateLimitData);
    }
  } catch {
    // Битий JSON — починаємо з нуля
    data = { window: [0, 0], violations: [] };
  }

  // Оновлюємо вікно
  if (data.window[0] !== currentWindowStart) {
    data.window = [currentWindowStart, 0];
  }
  data.window[1]++;

  // Очищаємо старі violations (старші за 5 хв)
  data.violations = data.violations.filter((v) => now - v < VIOLATION_WINDOW_SECONDS);

  // Перевіряємо ліміт
  if (data.window[1] > LIMIT_PER_MINUTE) {
    data.violations.push(now);
    log("SEC:rate_limit", "EXCEEDED", {
      user_id: ctx.user.user_id,
      count: data.window[1],
      limit: LIMIT_PER_MINUTE,
      violations_5min: data.violations.length,
    });

    // Записуємо назад
    ctx.user.rate_limit_json = JSON.stringify(data);
    ctx.userDirty = true;

    // Автоблокування при систематичних порушеннях
    if (data.violations.length >= AUTO_BLOCK_THRESHOLD) {
      log("SEC:rate_limit", "AUTO-BLOCK triggered", {
        user_id: ctx.user.user_id,
        violations: data.violations.length,
      });
      ctx.user.is_blocked = 1;
      ctx.userDirty = true;
    }

    return false; // БЛОКУЄМО
  }

  // Записуємо оновлені дані
  ctx.user.rate_limit_json = JSON.stringify(data);
  ctx.userDirty = true;

  return true; // ДОЗВОЛЕНО
}
