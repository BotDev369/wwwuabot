/**
 * Правила контакту — те, що вирішує, що саме ляже в базу й чи відкриється лінк.
 *
 * Найважливіше тут — **межа з payload бота**: код їде в `?start=`, і якщо він
 * не проходить `isValidBotPayload`, бот відкине його ще до бази (а Telegram
 * обріже довгий параметр мовчки). Тому перевірка перетинає два модулі: це не
 * деталь лінка, а домовленість між ними.
 *
 * Поля перевіряються з того самого боку: `@username` регістронезалежний, а
 * примітки не ростуть понад стелю. Усе, що не проходить, стає **порожнім
 * значенням**, а не помилкою: картка не мусить ламатися від того, що людина
 * вставила в поле хендла цілий абзац.
 *
 * **Telegram-id тут немає, і це не пропущене.** Власник його не вписує —
 * поле id зникло з правил разом із полем ув картці: id ставить бот, коли
 * людина приходить за лінком, і вгадане число робило б контакт приєднаним без
 * жодного переходу.
 */

import { describe, expect, it } from "vitest";
import { isValidBotPayload } from "../content";
import {
  MAX_CONTACT_NAME,
  MAX_CONTACT_NOTES,
  MAX_CONTACT_USERNAME,
  buildInviteLink,
  inviteCodeFromToken,
  isInviteCode,
  sanitizeContactName,
  sanitizeContactNotes,
  sanitizeContactUsername,
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

describe("ім'я контакту", () => {
  it("обрізає краї, згортає пробіли й прибирає переноси", () => {
    expect(sanitizeContactName("  Карас\n Карасевич  ")).toBe("Карас Карасевич");
  });

  it("довге ім'я обрізається до стелі", () => {
    expect(sanitizeContactName("я".repeat(200))).toHaveLength(MAX_CONTACT_NAME);
  });

  it("не рядок — порожнє ім'я, а не «[object]»", () => {
    expect(sanitizeContactName(undefined)).toBe("");
    expect(sanitizeContactName(42)).toBe("");
  });
});

describe("@username", () => {
  it("знімає `@`, знижує регістр і викидає все поза алфавітом Telegram", () => {
    expect(sanitizeContactUsername("  @Karas_2 ")).toBe("karas_2");
    expect(sanitizeContactUsername("@@karas")).toBe("karas");
    // Усе, що не лишилось від хендла, — це відсутність хендла (`null`).
    expect(sanitizeContactUsername("карас")).toBeNull();
  });

  it("порожній стає `null`, а не порожнім рядком", () => {
    // «Не знаю хендла» — це відсутність значення; порожній рядок у базі
    // змушував би відрізняти одне від одного у кожному читанні.
    expect(sanitizeContactUsername("   ")).toBeNull();
    expect(sanitizeContactUsername("@@")).toBeNull();
    expect(sanitizeContactUsername(null)).toBeNull();
  });

  it("довгий хендл обрізається до стелі Telegram", () => {
    expect(sanitizeContactUsername("a".repeat(60))).toHaveLength(MAX_CONTACT_USERNAME);
  });
});

describe("примітки", () => {
  it("краї обрізає, а всередині лишає як написано", () => {
    expect(sanitizeContactNotes("  перший\nдругий  ")).toBe("перший\nдругий");
  });

  it("довгі примітки обрізаються до стелі", () => {
    expect(sanitizeContactNotes("я".repeat(MAX_CONTACT_NOTES + 50))).toHaveLength(
      MAX_CONTACT_NOTES,
    );
  });

  it("не рядок — порожньо", () => {
    expect(sanitizeContactNotes({ note: "x" })).toBe("");
  });
});
