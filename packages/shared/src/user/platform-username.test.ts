import { describe, it, expect } from "vitest";
import {
  PLATFORM_USERNAME_MAX,
  PLATFORM_USERNAME_MIN,
  formatPlatformUsername,
  normalizePlatformUsername,
  validatePlatformUsername,
} from "./platform-username";

/**
 * Правило імені на платформі — одна точка для TWA й адмінки. Тести фіксують
 * саме те, за що платить користувач: що `@Name` і `name` — одне ім'я (інакше
 * з'явились би два рядки, які потім треба зводити вручну), що межі довжини
 * справді діють і що службові імена зайняти не можна.
 */
describe("normalizePlatformUsername", () => {
  it("прибирає `@`, пробіли по краях і регістр", () => {
    expect(normalizePlatformUsername("  @Serhii  ")).toBe("serhii");
    expect(normalizePlatformUsername("@@Name")).toBe("name");
  });

  it("порожнє лишається порожнім", () => {
    expect(normalizePlatformUsername("   ")).toBe("");
    expect(normalizePlatformUsername("@")).toBe("");
  });
});

describe("validatePlatformUsername", () => {
  it("приймає звичайне ім'я й повертає його ж у нижньому регістрі", () => {
    const result = validatePlatformUsername("Serhii_01");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("serhii_01");
  });

  it("не пускає порожнє, закоротке й задовге", () => {
    expect(validatePlatformUsername("")).toMatchObject({ ok: false, error: "empty" });
    // Позначка — це позначка: і `@`, і `#` самі собою імені не роблять.
    expect(validatePlatformUsername("@")).toMatchObject({ ok: false, error: "empty" });
    expect(validatePlatformUsername("#")).toMatchObject({ ok: false, error: "empty" });
    expect(validatePlatformUsername("ab")).toMatchObject({ ok: false, error: "too_short" });
    expect(validatePlatformUsername("a".repeat(PLATFORM_USERNAME_MAX + 1))).toMatchObject({
      ok: false,
      error: "too_long",
    });
    expect(validatePlatformUsername("a".repeat(PLATFORM_USERNAME_MAX)).ok).toBe(true);
    expect(validatePlatformUsername("a".repeat(PLATFORM_USERNAME_MIN)).ok).toBe(true);
  });

  it("не пускає цифру чи підкреслення на початку, подвійне підкреслення і хвіст із нього", () => {
    expect(validatePlatformUsername("1serhii")).toMatchObject({ ok: false, error: "bad_chars" });
    expect(validatePlatformUsername("_serhii")).toMatchObject({ ok: false, error: "bad_chars" });
    expect(validatePlatformUsername("ser__hii")).toMatchObject({ ok: false, error: "bad_chars" });
    expect(validatePlatformUsername("serhii_")).toMatchObject({ ok: false, error: "bad_chars" });
  });

  it("не пускає пробіли, дефіси, кирилицю й крапки", () => {
    for (const bad of ["се ргій", "ser-hii", "сергій", "ser.hii", "ser hii"]) {
      expect(validatePlatformUsername(bad), bad).toMatchObject({ ok: false, error: "bad_chars" });
    }
  });

  it("не дає зайняти службове ім'я (і не залежить від регістру)", () => {
    expect(validatePlatformUsername("admin")).toMatchObject({ ok: false, error: "reserved" });
    expect(validatePlatformUsername("@ADMIN")).toMatchObject({ ok: false, error: "reserved" });
    expect(validatePlatformUsername("#Admin")).toMatchObject({ ok: false, error: "reserved" });
    expect(validatePlatformUsername("WWWUABot")).toMatchObject({ ok: false, error: "reserved" });
  });

  it("кожна відмова має текст — UI не мусить вигадувати свій", () => {
    for (const bad of ["", "ab", "1x", "admin", "a".repeat(99)]) {
      const result = validatePlatformUsername(bad);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
    }
  });
});

describe("formatPlatformUsername", () => {
  it("позначає ім'я на платформі `#` — і не подвоює позначку", () => {
    // `@` лишається Telegram-хендлу: там він веде на акаунт. Наше ім'я має свою
    // позначку, інакше в одному рядку стояли б два однакові знаки.
    expect(formatPlatformUsername("#Name")).toBe("#name");
    expect(formatPlatformUsername("name")).toBe("#name");
    // Хто звик до `@` — не отримує відмови за зайвий знак.
    expect(formatPlatformUsername("@Name")).toBe("#name");
  });

  it("без імені повертає undefined, а не пустий рядок", () => {
    expect(formatPlatformUsername(null)).toBeUndefined();
    expect(formatPlatformUsername(undefined)).toBeUndefined();
    expect(formatPlatformUsername("  ")).toBeUndefined();
  });
});
