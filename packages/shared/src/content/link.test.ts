/**
 * Діплінк як третє подання адреси — тести.
 *
 * Тут перевіряється те, що неможливо побачити очима: посилання або **мовчки**
 * не працює (`@` у імені бота, задовгий параметр), або веде не туди (`_`
 * усередині сегмента — Telegram розділить його на два). Обидва випадки тихі,
 * тому кожен закріплений окремим тестом.
 */

import { describe, expect, it } from "vitest";
import { HOME_SLUG, MAX_BOT_PAYLOAD, isDeepLinkable } from "./resolve";
import { TELEGRAM_ORIGIN, buildShareLinks, isValidBotUsername } from "./link";

const BOT = "wwwuabot";

describe("buildShareLinks", () => {
  it("збирає діплінк із тим самим параметром, що й `toBotPayload`", () => {
    const links = buildShareLinks({
      slug: "mydate",
      params: ["1980-03-03", "today"],
      botUsername: BOT,
    });

    expect(links.payload).toBe("mydate_1980-03-03_today");
    expect(links.deepLink).toBe(`${TELEGRAM_ORIGIN}/${BOT}?start=mydate_1980-03-03_today`);
    expect(links.webPath).toBe("/mydate/1980-03-03/today");
    expect(links.reason).toBe("ok");
  });

  it("головна сторінка дає діплінк без параметра, а не `?start=`", () => {
    const links = buildShareLinks({ slug: HOME_SLUG, botUsername: BOT });

    expect(links.deepLink).toBe(`${TELEGRAM_ORIGIN}/${BOT}`);
    expect(links.webPath).toBe("/");
  });

  it("знімає `@` з імені бота — інакше посилання не відкривається", () => {
    const links = buildShareLinks({ slug: "about", botUsername: "@wwwuabot" });

    expect(links.deepLink).toBe(`${TELEGRAM_ORIGIN}/${BOT}?start=about`);
    expect(links.deepLink).not.toContain("@");
  });

  it("абсолютна веб-адреса — лише коли виклик передав базу платформи", () => {
    const withoutBase = buildShareLinks({ slug: "about", botUsername: BOT });
    expect(withoutBase.webUrl).toBeNull();

    const withBase = buildShareLinks({
      slug: "about",
      botUsername: BOT,
      webBase: "https://web.example.dev/",
    });
    expect(withBase.webUrl).toBe("https://web.example.dev/about");
  });

  it("мовить причину, чому діплінка немає, а не порожнє поле", () => {
    const noBot = buildShareLinks({ slug: "about" });
    expect(noBot.deepLink).toBeNull();
    expect(noBot.reason).toBe("no_bot_username");

    // `_` усередині сегмента: адреса існує, але діплінк неможливий.
    const brokenSlug = buildShareLinks({ slug: "price_list", botUsername: BOT });
    expect(brokenSlug.deepLink).toBeNull();
    expect(brokenSlug.reason).toBe("invalid_slug");

    const tooLong = buildShareLinks({ slug: "a".repeat(70), botUsername: BOT });
    expect(tooLong.deepLink).toBeNull();
    expect(tooLong.reason).toBe("too_long");
  });

  it("адресу показує як є — щоб людина побачила, що саме виправляти", () => {
    // Нормалізацію (`_` → `-`) робить міграція, а не читання: тихе переписування
    // чужого рядка дало б адресу, якої в базі немає.
    const links = buildShareLinks({ slug: "price_list", botUsername: BOT });

    expect(links.webPath).toBe("/price_list");
    expect(links.reason).toBe("invalid_slug");
  });

  it("межа довжини — та сама, що в `isDeepLinkable`", () => {
    // Рівно на межі: параметр довжиною `MAX_BOT_PAYLOAD` ще проходить.
    const exact = "a".repeat(MAX_BOT_PAYLOAD);
    expect(isDeepLinkable(exact)).toBe(true);
    expect(buildShareLinks({ slug: exact, botUsername: BOT }).reason).toBe("ok");

    const over = "a".repeat(MAX_BOT_PAYLOAD + 1);
    expect(isDeepLinkable(over)).toBe(false);
    expect(buildShareLinks({ slug: over, botUsername: BOT }).reason).toBe("too_long");
  });

  it("не робить діплінк із не-імені бота", () => {
    expect(isValidBotUsername("")).toBe(false);
    expect(isValidBotUsername("@")).toBe(false);
    expect(isValidBotUsername("ab")).toBe(false);
    expect(isValidBotUsername("1bot")).toBe(false);
    expect(isValidBotUsername("bot")).toBe(false);
    expect(isValidBotUsername("my_bot")).toBe(true);
    expect(isValidBotUsername("@wwwuabot")).toBe(true);
  });
});
