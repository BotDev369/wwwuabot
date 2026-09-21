import { describe, expect, it } from "vitest";
import {
  THEME_NAME_MAX_LENGTH,
  isThemeApplied,
  validateThemeName,
  validateThemeScheme,
} from "./rules";

describe("validateThemeName (назва схеми)", () => {
  it("обрізає пробіли й лишає назву як є", () => {
    expect(validateThemeName("  Ніч у Львові  ")).toEqual({ ok: true, value: "Ніч у Львові" });
  });

  it("⛔ порожня назва не зберігається", () => {
    expect(validateThemeName("   ").ok).toBe(false);
    expect(validateThemeName(null).ok).toBe(false);
  });

  it("⛔ задовга назва має межу", () => {
    expect(validateThemeName("я".repeat(THEME_NAME_MAX_LENGTH)).ok).toBe(true);
    expect(validateThemeName("я".repeat(THEME_NAME_MAX_LENGTH + 1)).ok).toBe(false);
  });
});

describe("validateThemeScheme (схема теми)", () => {
  const valid = {
    name: "Сутінки",
    bg: "#101020",
    text: "#f0f0ff",
    accent: "#c084fc",
    font: "inter",
  };

  it("приводить кольори до канонічного вигляду й лишає відомі поля", () => {
    const result = validateThemeScheme({ ...valid, id: 7, isPublic: true, зайве: "ні" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      id: 7,
      name: "Сутінки",
      bg: "#101020",
      text: "#f0f0ff",
      accent: "#c084fc",
      font: "inter",
      isPublic: true,
    });
    expect(result.value).not.toHaveProperty("зайве");
  });

  it("порожній шрифт — це «як у стилі», а не помилка", () => {
    const result = validateThemeScheme({ ...valid, font: "" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.font).toBe("");
  });

  it("⛔ не-HEX колір відхиляється з назвою слота", () => {
    const result = validateThemeScheme({ ...valid, accent: "синій" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("Акцент");
  });

  it("⛔ невідомий шрифт не проходить: у базі лежить лише id зі списку", () => {
    const result = validateThemeScheme({ ...valid, font: "comic-sans" });
    expect(result.ok).toBe(false);
  });

  it("⛔ без назви схема не пишеться", () => {
    expect(validateThemeScheme({ ...valid, name: "" }).ok).toBe(false);
  });
});

describe("isThemeApplied (що діє на екрані зараз)", () => {
  const scheme = { bg: "#101020", text: "#f0f0ff", accent: "#c084fc", font: "inter" };

  it("збіг за кольорами **і** шрифтом", () => {
    expect(
      isThemeApplied(scheme, { bg: scheme.bg, text: scheme.text, accent: scheme.accent }, "inter"),
    ).toBe(true);
  });

  it("⛔ інший шрифт — це вже інша схема", () => {
    expect(
      isThemeApplied(scheme, { bg: scheme.bg, text: scheme.text, accent: scheme.accent }, "lora"),
    ).toBe(false);
  });

  it("⛔ неповний вибір не збігається ні з чим", () => {
    expect(isThemeApplied(scheme, { bg: scheme.bg }, "")).toBe(false);
  });
});
