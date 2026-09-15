import { describe, it, expect, vi, afterEach } from "vitest";
import { applyChromeColors, isTelegramWebApp, normalizeChromeColor } from "./telegram-chrome";
import type { TelegramChromeColor, TelegramWebApp } from "../types/telegram";

/**
 * Нативний хром Telegram — шапка й низ клієнта в кольорах теми. Тести
 * фіксують сам контракт з клієнтом: який набір методів кличеться, що
 * невалідне значення не доходить до Telegram і що кожен метод — власний
 * try (клієнт без `setBottomBarColor` не повинен зривати шапку).
 */
describe("normalizeChromeColor", () => {
  it("приймає плоский #rrggbb і опускає регістр", () => {
    expect(normalizeChromeColor("#1C1C1E")).toBe("#1c1c1e");
    expect(normalizeChromeColor("  #f2f2f7  ")).toBe("#f2f2f7");
  });

  it("відхиляє те, що Telegram не прийме", () => {
    expect(normalizeChromeColor("")).toBeUndefined();
    expect(normalizeChromeColor("#fff")).toBeUndefined(); // 3-значний
    expect(normalizeChromeColor("#12345")).toBeUndefined();
    expect(normalizeChromeColor("radial-gradient(...)")).toBeUndefined();
    expect(normalizeChromeColor("var(--bg-1)")).toBeUndefined();
  });
});

describe("isTelegramWebApp", () => {
  it("обʼєкт без жодного методу кольору — не WebApp", () => {
    expect(isTelegramWebApp(undefined)).toBe(false);
    expect(isTelegramWebApp(null)).toBe(false);
    expect(isTelegramWebApp({})).toBe(false);
    expect(isTelegramWebApp({ ready: () => undefined })).toBe(false);
  });

  it("обʼєкт з методом кольору — WebApp", () => {
    expect(isTelegramWebApp({ setHeaderColor: () => undefined })).toBe(true);
    expect(isTelegramWebApp({ setBottomBarColor: () => undefined })).toBe(true);
  });
});

describe("applyChromeColors", () => {
  const header = "#1c1c1e" as TelegramChromeColor;
  const bottom = "#2c2c2e" as TelegramChromeColor;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function makeApp(): {
    app: TelegramWebApp;
    calls: string[];
  } {
    const calls: string[] = [];
    const app = {
      setHeaderColor: (c: TelegramChromeColor) => calls.push(`header:${c}`),
      setBackgroundColor: (c: TelegramChromeColor) => calls.push(`background:${c}`),
      setBottomBarColor: (c: TelegramChromeColor) => calls.push(`bottom:${c}`),
    };
    return { app, calls };
  }

  it("кличе всі три методи: шапка+фон — колір шапки, низ — свій", () => {
    const { app, calls } = makeApp();
    applyChromeColors(app, header, bottom);
    expect(calls).toEqual(["header:#1c1c1e", "background:#1c1c1e", "bottom:#2c2c2e"]);
  });

  it("метод, який клієнт не знає, не зриває решту", () => {
    const calls: string[] = [];
    const app: TelegramWebApp = {
      setHeaderColor: (c) => calls.push(`header:${c}`),
      // setBackgroundColor відсутній
      setBottomBarColor: (c) => calls.push(`bottom:${c}`),
    };
    applyChromeColors(app, header, bottom);
    expect(calls).toEqual(["header:#1c1c1e", "bottom:#2c2c2e"]);
  });

  it("виняток від клієнта (стара версія) не зриває решту", () => {
    const calls: string[] = [];
    const app: TelegramWebApp = {
      setHeaderColor: () => {
        throw new Error("method not supported");
      },
      setBackgroundColor: (c) => calls.push(`background:${c}`),
    };
    applyChromeColors(app, header, bottom);
    expect(calls).toEqual(["background:#1c1c1e"]);
  });

  it("порожній WebApp — без викликів і без падінь", () => {
    expect(() => applyChromeColors({}, header, bottom)).not.toThrow();
  });
});
