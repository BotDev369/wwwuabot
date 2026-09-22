/**
 * Тести виведеного підпису для бота.
 *
 * Три речі, які легко зламати мовчки: підпис береться з `page_data` (а не
 * звідкись іще), готовий підпис автора не перебивається, і текст людини
 * приходить екранованим — інакше `<` у назві ламає розмітку всього повідомлення.
 */

import { describe, expect, it } from "vitest";
import { buildPageConfig, pageTemplate } from "@wwwuabot/shared/pages";
import { pageBotCaption } from "./page-caption";

const card = pageTemplate("card");

function pageData(values: Record<string, string>): string {
  return JSON.stringify(buildPageConfig(card, values));
}

describe("pageBotCaption", () => {
  it("виводить назву й короткі поля з `page_data`", () => {
    const caption = pageBotCaption({
      template_key: "card",
      page_data: pageData({ title: "Олена", tagline: "Роблю сайти", about: "Абзац." }),
      captions: [null, null, null],
    });

    expect(caption).toBe("Олена\n\nРоблю сайти");
  });

  it("не чіпає підпис, який уже є", () => {
    const caption = pageBotCaption({
      template_key: "card",
      page_data: pageData({ title: "Олена" }),
      captions: ["Написано в адмінці", null, null],
    });

    expect(caption).toBeNull();
  });

  it("контент платформи без шаблону підпису не отримує", () => {
    const caption = pageBotCaption({
      template_key: null,
      page_data: pageData({ title: "Олена" }),
      captions: [null, null, null],
    });

    expect(caption).toBeNull();
  });

  it("текст людини приходить екранованим — HTML у підписі заборонено", () => {
    const caption = pageBotCaption({
      template_key: "card",
      page_data: pageData({ title: "<b>Олена</b>", tagline: "5 > 3 & далі" }),
      captions: [null, null, null],
    });

    expect(caption).toBe("&lt;b&gt;Олена&lt;/b&gt;\n\n5 &gt; 3 &amp; далі");
  });
});
