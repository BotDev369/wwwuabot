// @vitest-environment jsdom
/**
 * Старт нативного хрому: те, що застосунок робить один раз — фарбує шапку й низ
 * клієнта кольорами теми, каже `ready` і просить повний екран (щоб шапки
 * клієнта з іменем бота не було взагалі).
 *
 * Перевіряється саме те, що ламається мовчки: без токенів у CSS виклику немає,
 * без `window.Telegram` модуль нічого не робить, а відписка справді знімає
 * підписку на тему клієнта.
 *
 * @module packages/shared/src/app/telegram-chrome.dom.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { applyClientInsets, initTelegramChrome } from "./telegram-chrome";
import type { TelegramWebApp } from "../types/telegram";

const HEADER = "#1c1c1e";
const BOTTOM = "#2c2c2e";

interface Stub {
  app: TelegramWebApp;
  calls: string[];
  handlers: Map<string, () => void>;
}

/**
 * Фейковий WebApp: записує виклики так, як їх бачить застосунок.
 * `isVersionAtLeast` відповідає «так» — клієнт Bot API 8.0+.
 */
function install(over: Partial<TelegramWebApp> = {}): Stub {
  const calls: string[] = [];
  const handlers = new Map<string, () => void>();
  const app: TelegramWebApp = {
    ready: () => calls.push("ready"),
    setHeaderColor: (color) => calls.push(`header:${color}`),
    setBackgroundColor: (color) => calls.push(`background:${color}`),
    setBottomBarColor: (color) => calls.push(`bottom:${color}`),
    isVersionAtLeast: () => true,
    requestFullscreen: () => calls.push("fullscreen"),
    onEvent: (event, handler) => void handlers.set(event, handler),
    offEvent: (event) => {
      handlers.delete(event);
      calls.push(`off:${event}`);
    },
    ...over,
  };
  window.Telegram = { WebApp: app };
  return { app, calls, handlers };
}

/**
 * jsdom не читає власні CSS-змінні з `getComputedStyle`, тож токени підставляємо
 * підставним обʼєктом — тим самим інтерфейсом, який читає сам модуль.
 */
function mockTokens(tokens: Record<string, string>): void {
  vi.spyOn(window, "getComputedStyle").mockReturnValue({
    getPropertyValue: (name: string) => tokens[name] ?? "",
  } as unknown as CSSStyleDeclaration);
}

afterEach(() => {
  vi.restoreAllMocks();
  delete window.Telegram;
});

describe("initTelegramChrome", () => {
  it("фарбує шапку, фон і низ кольорами теми та просить повний екран", () => {
    mockTokens({ "--chrome-header-bg": HEADER, "--chrome-bottom-bg": BOTTOM });
    const { calls } = install();

    initTelegramChrome();

    expect(calls).toContain("ready");
    expect(calls).toContain(`header:${HEADER}`);
    expect(calls).toContain(`background:${HEADER}`);
    expect(calls).toContain(`bottom:${BOTTOM}`);
    expect(calls).toContain("fullscreen");
  });

  it("без токенів у CSS кольорів не шле (розмітка ще не готова) — але повний екран просить", () => {
    mockTokens({});
    const { calls } = install();

    initTelegramChrome();

    // Кольорів немає зовсім: у списку викликів лишаються тільки ці два.
    expect(calls).toEqual(["ready", "fullscreen"]);
  });

  it("на зміну теми клієнта перечитує токени", () => {
    mockTokens({ "--chrome-header-bg": HEADER, "--chrome-bottom-bg": BOTTOM });
    const { calls, handlers } = install();

    initTelegramChrome();
    const before = calls.length;

    expect(handlers.get("themeChanged"), "підписка на тему клієнта").toBeDefined();
    handlers.get("themeChanged")?.();

    expect(calls.length).toBeGreaterThan(before);
    expect(calls.at(-1)).toBe(`bottom:${BOTTOM}`);
  });

  it("відписка знімає підписку на тему клієнта", () => {
    mockTokens({ "--chrome-header-bg": HEADER, "--chrome-bottom-bg": BOTTOM });
    const { calls, handlers } = install();

    const stop = initTelegramChrome();
    stop();

    expect(calls).toContain("off:themeChanged");
    expect(handlers.has("themeChanged")).toBe(false);
  });

  it("без `window.Telegram` — no-op, який нічого не ламає", () => {
    mockTokens({ "--chrome-header-bg": HEADER, "--chrome-bottom-bg": BOTTOM });
    delete window.Telegram;

    const stop = initTelegramChrome();

    expect(() => stop()).not.toThrow();
  });

  it("публікує вставки клієнта змінними на `<html>`", () => {
    mockTokens({ "--chrome-header-bg": HEADER, "--chrome-bottom-bg": BOTTOM });
    install({
      contentSafeAreaInset: { top: 56, bottom: 12, left: 0, right: 0 },
    });

    initTelegramChrome();

    const root = document.documentElement.style;
    expect(root.getPropertyValue("--client-inset-top")).toBe("56px");
    expect(root.getPropertyValue("--client-inset-bottom")).toBe("12px");
  });

  it("вставки читає після `ready` — клієнт заповнює їх, показуючи застосунок", () => {
    mockTokens({ "--chrome-header-bg": HEADER, "--chrome-bottom-bg": BOTTOM });
    // Клієнт віддає нулі, поки застосунок не готовий: прочитане до `ready`
    // лишається нулями — і хедер стоїть під його кнопками.
    const { app } = install({
      ready: () => {
        app.contentSafeAreaInset = { top: 64, bottom: 0, left: 0, right: 0 };
      },
    });

    initTelegramChrome();

    expect(document.documentElement.style.getPropertyValue("--client-inset-top")).toBe("64px");
  });

  it("на зміну вставок клієнта перечитує їх (вхід у повний екран — теж подія)", () => {
    mockTokens({ "--chrome-header-bg": HEADER, "--chrome-bottom-bg": BOTTOM });
    const { app, handlers } = install();

    initTelegramChrome();
    expect(document.documentElement.style.getPropertyValue("--client-inset-top")).toBe("0px");

    expect(handlers.get("contentSafeAreaChanged"), "підписка на вставки").toBeDefined();
    app.contentSafeAreaInset = { top: 56, bottom: 0, left: 0, right: 0 };
    handlers.get("contentSafeAreaChanged")?.();

    expect(document.documentElement.style.getPropertyValue("--client-inset-top")).toBe("56px");
  });
});

describe("applyClientInsets", () => {
  it("пише в переданий корінь, а не шукає документ", () => {
    const el = document.createElement("div");
    applyClientInsets({ isFullscreen: true }, el);
    expect(el.style.getPropertyValue("--client-inset-top")).toBe("48px");
  });
});
