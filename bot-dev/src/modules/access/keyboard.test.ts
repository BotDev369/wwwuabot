/**
 * Постійна клавіатура під чатом — тести.
 *
 * Тут перевіряється те, що ламається мовчки: адреси кнопок. Кнопка з помилкою
 * в адресі просто відкриває 404, і ніхто не дізнається, що вона «не працює».
 * Тому адреси порівнюються з **спільними** шляхами платформи, а не з литералами
 * цього тесту.
 *
 * @module bot-dev/src/modules/access/keyboard.test
 */

import { describe, expect, it } from "vitest";
import { FAVORITES_PATH, PROFILE_PATH, SPACE_PATH } from "@wwwuabot/shared/app/routes";
import { buildMainKeyboard } from "./keyboard";

const PLATFORM = "https://app.example.com";

/** Кнопки одного рядка — саме так їх віддає Telegram. */
function row(keyboard: ReturnType<typeof buildMainKeyboard>) {
  return keyboard?.keyboard[0] as { text: string; web_app: { url: string } }[];
}

describe("клавіатура під чатом", () => {
  it("три кнопки ведуть на ті самі адреси, що й пункти платформи", () => {
    const buttons = row(buildMainKeyboard(PLATFORM));

    expect(buttons.map((b) => b.web_app.url)).toEqual([
      `${PLATFORM}${PROFILE_PATH}`,
      `${PLATFORM}${FAVORITES_PATH}`,
      `${PLATFORM}${SPACE_PATH}`,
    ]);
  });

  it("⛔ клавіатура лишається на місці й не ховається сама", () => {
    const keyboard = buildMainKeyboard(PLATFORM);

    // `is_persistent` — інакше Telegram прибрав би клавіатуру через кілька днів
    // тиші, і людина не знала б, як повернутися.
    expect(keyboard?.is_persistent).toBe(true);
    expect(keyboard?.resize_keyboard).toBe(true);
  });

  it("⛔ без адреси платформи клавіатури немає — Telegram не прийме кнопку без url", () => {
    expect(buildMainKeyboard(undefined)).toBeNull();
    expect(buildMainKeyboard("")).toBeNull();
  });

  it("підписи короткі: клавіатура — це один рядок на телефоні", () => {
    const buttons = row(buildMainKeyboard(PLATFORM));

    // Обрізаний підпис виглядає як помилка, а не як скорочення.
    for (const button of buttons) {
      expect(button.text.length).toBeLessThanOrEqual(12);
    }
  });
});
