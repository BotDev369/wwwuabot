import type { AppContext } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";

/**
 * Обробляє callback-кнопки (наразі тільки навігація, без дій `@...`).
 *
 * @param ctx - Контекст бота
 * @param data - callback_data з Telegram
 * @returns codeword для навігації, або null якщо це дія `@...`
 */
export function handleCallback(ctx: AppContext, data: string): string | null {
  // Якщо починається з `@` — це дія, не навігація (обробимо пізніше)
  if (data.startsWith("@")) {
    log("CALLBACK", "type: action (not implemented yet)", { data });
    return null;
  }

  // Інакше — навігація: callback_data = codeword
  log("CALLBACK", "type: navigation", { codeword: data });
  return data;
}
