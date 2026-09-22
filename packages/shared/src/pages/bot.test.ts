/**
 * Тести підпису для бота.
 *
 * Перевіряється рівно те, чим цей підпис відрізняється від сторінки: назва й
 * **короткі** поля — і жодного абзацу. Переказати «Про себе» в повідомленні
 * означало б дати обрізаний текст замість повного, а кнопка «Відкрити сторінку»
 * існує саме для нього.
 */

import { describe, expect, it } from "vitest";
import { pageBotText } from "./bot";
import { pageTemplate } from "./templates";

const card = pageTemplate("card");
const event = pageTemplate("event");

describe("pageBotText", () => {
  it("бере назву та короткі поля — абзац не переказує", () => {
    const text = pageBotText(card, {
      title: "Олена",
      tagline: "Роблю сайти",
      about: "Довгий абзац, який у повідомленні був би обрізаний.",
      contact: "@olena",
    });

    expect(text).toBe("Олена\n\nРоблю сайти\n@olena");
  });

  it("порядок полів — порядок шаблону", () => {
    const text = pageBotText(event, {
      title: "Зустріч",
      when: "12 жовтня",
      where: "Київ",
      about: "Програма.",
      terms: "Вхід вільний",
    });

    expect(text).toBe("Зустріч\n\n12 жовтня\nКиїв\nВхід вільний");
  });

  it("невідповідені поля не лишають ані рядків, ані порожніх абзаців", () => {
    expect(pageBotText(card, { title: "Олена" })).toBe("Олена");
  });

  it("порожні значення — порожній підпис, а не рядок із пробілів", () => {
    expect(pageBotText(card, {})).toBe("");
    expect(pageBotText(card, { title: "   " })).toBe("");
  });
});
