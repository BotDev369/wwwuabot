/**
 * Правила лінка-запрошення — те, що вирішує, чи відкриється посилання.
 *
 * Найважливіше тут — **межа з payload бота**: код їде в `?start=`, і якщо він
 * не проходить `isValidBotPayload`, бот відкине його ще до бази (а Telegram
 * обріже довгий параметр мовчки). Тому перевірка перетинає два модулі: це не
 * деталь лінка, а домовленість між ними.
 */

import { describe, expect, it } from "vitest";
import { isValidBotPayload } from "../content";
import {
  MAX_INVITE_LABEL,
  buildInviteLink,
  contactDisplayName,
  inviteCodeFromToken,
  isInviteCode,
  sanitizeInviteLabel,
} from "./index";

describe("код запрошення", () => {
  it("з випадкового токена виходить код із префіксом", () => {
    expect(inviteCodeFromToken("8F3K2Q")).toBe("inv-8f3k2q");
  });

  it("⛔ токен, який не придатний, коду не дає", () => {
    // `_` — розділювач сегментів payload: з ним код розсипався б на два.
    expect(inviteCodeFromToken("inv_8f3k")).toBeNull();
    expect(inviteCodeFromToken("коротко")).toBeNull();
    expect(inviteCodeFromToken("a")).toBeNull();
    expect(inviteCodeFromToken(7)).toBeNull();
  });

  it("готовий код проходить перевірку payload бота — інакше бот його відкине", () => {
    const code = inviteCodeFromToken("8f3k2q")!;
    expect(isValidBotPayload(code)).toBe(true);
    expect(isInviteCode(code)).toBe(true);
  });

  it("⛔ адреса сторінки кодом не вважається", () => {
    expect(isInviteCode("mydate")).toBe(false);
    expect(isInviteCode("inv")).toBe(false);
  });
});

describe("готовий лінк", () => {
  const code = "inv-8f3k2q";

  it("зі @ і без @ веде на один і той самий діплінк", () => {
    expect(buildInviteLink("wwwuabot", code)).toEqual({
      deepLink: "https://t.me/wwwuabot?start=inv-8f3k2q",
      reason: "ok",
    });
    expect(buildInviteLink("@wwwuabot", code).deepLink).toBe(
      "https://t.me/wwwuabot?start=inv-8f3k2q",
    );
  });

  it("⛔ без імені бота лінка немає — і причина названа", () => {
    // Порожній рядок тут не «майже лінк», а причина сказати людині вголос.
    expect(buildInviteLink("", code)).toEqual({ deepLink: null, reason: "no_bot_username" });
    expect(buildInviteLink(null, code).reason).toBe("no_bot_username");
  });

  it("⛔ зі зіпсованим кодом лінк не збирається взагалі", () => {
    expect(buildInviteLink("wwwuabot", "inv-8f3k")).toEqual({
      deepLink: null,
      reason: "invalid_code",
    });
  });
});

describe("підпис контакту", () => {
  it("обрізає краї, згортає пробіли й прибирає переноси", () => {
    expect(sanitizeInviteLabel("  Карас\n Карасевич  ")).toBe("Карас Карасевич");
  });

  it("довгий підпис обрізається до стелі", () => {
    expect(sanitizeInviteLabel("я".repeat(200))).toHaveLength(MAX_INVITE_LABEL);
  });

  it("не рядок — порожній підпис, а не «[object]»", () => {
    expect(sanitizeInviteLabel(undefined)).toBe("");
    expect(sanitizeInviteLabel(42)).toBe("");
  });
});

describe("ім'я контакту", () => {
  it("ім'я на платформі переважає Telegram-ім'я", () => {
    expect(
      contactDisplayName({ platformUsername: "Карас", firstName: "Sergiy", username: "karas" }),
    ).toBe("Карас");
  });

  it("без імені на платформі збирається ім'я з Telegram", () => {
    expect(contactDisplayName({ firstName: "Sergiy", lastName: "Diskant" })).toBe("Sergiy Diskant");
  });

  it("лишається хендл, коли нічого іншого немає", () => {
    expect(contactDisplayName({ username: "karas" })).toBe("@karas");
  });

  it("порожній профіль не лишає рядок без імені", () => {
    // `...` — це те, чим бот колись заповнював відсутні поля.
    expect(contactDisplayName({ firstName: "...", lastName: "...", username: null })).toBe(
      "Без імені",
    );
  });
});
