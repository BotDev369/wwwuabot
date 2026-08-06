import type { AppContext } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";

/**
 * Обробляє Telegram-команди (наразі тільки /start).
 * 
 * @param ctx - Контекст бота
 * @param text - Текст повідомлення
 * @returns codeword для навігації, або null якщо це не команда
 */
export function handleCommand(ctx: AppContext, text: string): string | null {
  if (!text.startsWith("/")) return null;
  
  const command = text.split(" ")[0].split("@")[0]; // /start або /start@botname
  if (command !== "/start") return null;
  
  const parts = text.split(" ");
  const codeword = parts[1]?.trim() || "main";
  
  log("COMMAND", "type: command /start", { codeword, has_param: !!parts[1] });
  return codeword;
}