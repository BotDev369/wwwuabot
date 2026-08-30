import { log } from "../../shared/utils/debug";

/**
 * Перевіряє, чи є текст командою /restart.
 * Ігнорує аргументи та bot username (@botname).
 */
export function isRestartCommand(text: string): boolean {
  const command = text.split(" ")[0].split("@")[0];
  return command === "/restart";
}

/**
 * Витягує param з команди /start.<param>.
 * Використовується для отримання deep link codeword.
 *
 * @returns param після /start, або null
 */
export function extractStartParam(text: string): string | null {
  if (!text.startsWith("/")) return null;
  const command = text.split(" ")[0].split("@")[0];
  if (command !== "/start") return null;
  const param = text.split(" ")[1]?.trim();
  return param || null;
}
