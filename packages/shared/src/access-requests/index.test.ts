/**
 * Межа повідомлення — те саме правило для прийому, панелі й тестів.
 *
 * @module @wwwuabot/shared/access-requests/test
 */

import { describe, expect, it } from "vitest";
import { ACCESS_REQUEST_MAX, accessRequestAuthor, sanitizeAccessRequestText } from "./index";

describe("текст повідомлення", () => {
  it("обрізає по межі, а не відкидає", () => {
    const long = "а".repeat(ACCESS_REQUEST_MAX + 50);
    expect(sanitizeAccessRequestText(long)).toHaveLength(ACCESS_REQUEST_MAX);
  });

  it("прибирає пробіли з країв", () => {
    expect(sanitizeAccessRequestText("  Куку  ")).toBe("Куку");
  });

  it("не-рядок — порожній текст, а не рядок «undefined»", () => {
    expect(sanitizeAccessRequestText(42)).toBe("");
    expect(sanitizeAccessRequestText(null)).toBe("");
    expect(sanitizeAccessRequestText({ text: "привіт" })).toBe("");
  });

  it("порожній текст лишається порожнім: сервер сам відкине такий рядок", () => {
    expect(sanitizeAccessRequestText("   ")).toBe("");
  });
});

describe("підпис автора", () => {
  it("сперву ім'я, потім платформа, потім Telegram", () => {
    expect(
      accessRequestAuthor({
        first_name: "Тест",
        last_name: "Тестовий",
        platform_username: "test",
        username: "test_tg",
      }),
    ).toBe("Тест Тестовий");

    expect(
      accessRequestAuthor({
        first_name: null,
        last_name: null,
        platform_username: "test",
        username: "test_tg",
      }),
    ).toBe("#test");

    expect(
      accessRequestAuthor({
        first_name: null,
        last_name: null,
        platform_username: null,
        username: "test_tg",
      }),
    ).toBe("@test_tg");
  });

  it("без жодного імені — прочерк, а не порожній рядок у колонці", () => {
    expect(
      accessRequestAuthor({
        first_name: null,
        last_name: null,
        platform_username: null,
        username: null,
      }),
    ).toBe("—");
  });
});
