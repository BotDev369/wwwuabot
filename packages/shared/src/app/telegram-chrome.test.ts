import { describe, it, expect, vi, afterEach } from "vitest";
import {
  applyChromeColors,
  applyFullscreen,
  isTelegramWebApp,
  normalizeChromeColor,
} from "./telegram-chrome";
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

/**
 * Повноекранний режим — єдиний спосіб прибрати власну шапку клієнта (рядок
 * з іменем бота й кнопкою «розгорнути»). Перевіряємо саме ті три умови, за
 * якими він запитується: клієнт досить новий, екран ще не повний і відмова
 * клієнта нічого не зриває.
 */
describe("applyFullscreen", () => {
  /** Клієнт Bot API 8.0+: метод є, версія та сама. */
  function makeApp(over: Partial<TelegramWebApp> = {}): {
    app: TelegramWebApp;
    calls: string[];
  } {
    const calls: string[] = [];
    const app: TelegramWebApp = {
      isVersionAtLeast: () => true,
      requestFullscreen: () => calls.push("fullscreen"),
      ...over,
    };
    return { app, calls };
  }

  it("просить повний екран у клієнта, який його вміє", () => {
    const { app, calls } = makeApp();
    applyFullscreen(app);
    expect(calls).toEqual(["fullscreen"]);
  });

  it("уже повний екран — не просить ще раз (кожна синхронізація теми не перезапускає перехід)", () => {
    const { app, calls } = makeApp({ isFullscreen: true });
    applyFullscreen(app);
    expect(calls).toEqual([]);
  });

  it("старий клієнт (до Bot API 8.0) — мовчимо, а не кидаємо", () => {
    const { app, calls } = makeApp({ isVersionAtLeast: () => false });
    expect(() => applyFullscreen(app)).not.toThrow();
    expect(calls).toEqual([]);
  });

  it("клієнт без `isVersionAtLeast` або без методу — без викликів і без падінь", () => {
    const { app, calls } = makeApp({ isVersionAtLeast: undefined });
    expect(() => applyFullscreen(app)).not.toThrow();
    expect(() => applyFullscreen({ requestFullscreen: undefined })).not.toThrow();
    expect(calls).toEqual([]);
  });

  it("відмова клієнта (виняток) не летить у застосунок", () => {
    const app: TelegramWebApp = {
      isVersionAtLeast: () => true,
      requestFullscreen: () => {
        throw new Error("fullscreen is not supported");
      },
    };
    expect(() => applyFullscreen(app)).not.toThrow();
  });
});
