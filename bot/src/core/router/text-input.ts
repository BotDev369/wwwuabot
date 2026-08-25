import type { AppContext } from "../../shared/types/env";
import type { Scenario } from "../../shared/types/scenario";
import { log } from "../../shared/utils/debug";

export interface TextInputResult {
  type: "record" | "navigate" | "ignore";
  codeword?: string;
  family?: string;
  inputPath?: string;
  value?: string;
}

/**
 * Обробляє вільний текст від користувача.
 * 
 * Логіка:
 * 1. Якщо поточний сценарій має awaits_input = "text" → запис за input_path
 * 2. Якщо текст збігається з codeword → навігація
 * 3. Інакше → ігнорувати
 * 
 * @param ctx - Контекст бота
 * @param text - Текст повідомлення
 * @param currentScenario - Поточний активний сценарій
 * @returns Результат обробки
 */
export function handleTextInput(
  ctx: AppContext,
  text: string,
  currentScenario: Scenario
): TextInputResult {
  const trimmedText = text.trim();
  
  // 1. Перевіряємо awaits_input
  if (currentScenario.awaits_input === "text" && currentScenario.input_path) {
    const family = currentScenario.codeword.split("_")[0];
    const nextCodeword = currentScenario.input_next || currentScenario.codeword;
    
    log("TEXT_INPUT", "awaits_input detected", {
      family,
      input_path: currentScenario.input_path,
      value: trimmedText,
      next: nextCodeword
    });
    
    return {
      type: "record",
      family,
      inputPath: currentScenario.input_path,
      value: trimmedText,
      codeword: nextCodeword
    };
  }
  
  // 2. Перевіряємо чи текст = codeword (навігація)
  const candidate = trimmedText.toLowerCase();
  log("TEXT_INPUT", "checking as codeword", { candidate });
  
  // Повертаємо candidate для подальшої перевірки в bot-router
  return {
    type: "navigate",
    codeword: candidate
  };
}