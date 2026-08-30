import type { Scenario } from "../../shared/types/scenario";
import { log } from "../../shared/utils/debug";
import { validateUserText } from "../../modules/security/input-validation";

export interface TextInputResult {
  type: "record" | "ignore";
  family?: string;
  inputPath?: string;
  value?: string;
  codeword?: string;
}

/**
 * Обробляє вільний текст від користувача.
 *
 * Логіка:
 * - Якщо поточний сценарій має awaits_input = "text" → валідуємо + записуємо за input_path
 * - Інакше → ignore (повідомлення буде видалене в bot-router)
 *
 * Бот НЕ реагує на текст як на навігацію — тільки зчитування вводу.
 *
 * @param ctx - Контекст бота
 * @param text - Текст повідомлення
 * @param currentScenario - Поточний активний сценарій
 * @returns Результат обробки
 */
export function handleTextInput(
  ctx: { env: any },
  text: string,
  currentScenario: Scenario,
): TextInputResult {
  // SEC-3: Валідуємо текст перед обробкою
  const validatedText = validateUserText(text);
  if (validatedText === null) {
    log("TEXT_INPUT", "rejected | invalid input", {
      text: text.substring(0, 30),
      active_scenario: currentScenario.codeword,
    });
    return { type: "ignore" };
  }

  // Перевіряємо awaits_input — тільки це визначає, чи обробляємо текст
  if (currentScenario.awaits_input === "text" && currentScenario.input_path) {
    const family = currentScenario.codeword.split("_")[0];
    const nextCodeword = currentScenario.input_next || currentScenario.codeword;

    log("TEXT_INPUT", "awaits_input detected", {
      family,
      input_path: currentScenario.input_path,
      value: validatedText,
      next: nextCodeword,
    });

    return {
      type: "record",
      family,
      inputPath: currentScenario.input_path,
      value: validatedText,
      codeword: nextCodeword,
    };
  }

  // Текст НЕ обробляється — бот не реагує на довільний текст
  log("TEXT_INPUT", "ignored | no awaits_input", {
    text: validatedText.substring(0, 50),
    active_scenario: currentScenario.codeword,
  });

  return { type: "ignore" };
}
