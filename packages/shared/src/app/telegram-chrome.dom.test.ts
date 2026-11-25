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
import {
  applyClientInsets,
  initTelegramChrome,
  readAppbarColor,
  readClientHeader,
} from "./telegram-chrome";
import type { TelegramWebApp, TelegramWebAppThemeParams } from "../types/telegram";

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

/** Усі запущені проходи: на сторінці він один, у тестах — знімаємо кожен. */
const started: Array<() => void> = [];

function start(): () => void {
  const stop = initTelegramChrome();
  started.push(stop);
  return stop;
}

afterEach(() => {
  for (const stop of started.splice(0)) stop();
  vi.restoreAllMocks();
  vi.useRealTimers();
  delete window.Telegram;
  document.documentElement.removeAttribute("data-chrome");
  document.documentElement.removeAttribute("data-tone");
  document.documentElement.style.removeProperty("--chrome-appbar-bg");
  document.documentElement.style.removeProperty("--chrome-appbar-ink");
});

/**
 * Клієнт, який сам каже, яка в нього шапка (`themeParams`), і може або
 * **приймати** `setHeaderColor` (тоді віддає новий колір назад), або
 * **ігнорувати** його (тоді `themeParams` не міняється).
 */
function installClient(options: { header?: string; bg?: string; echo?: boolean }): {
  calls: string[];
  themeParams: TelegramWebAppThemeParams;
} {
  const calls: string[] = [];
  const themeParams: TelegramWebAppThemeParams = {
    bg_color: options.bg,
    header_bg_color: options.header,
  };
  window.Telegram = {
    WebApp: {
      themeParams,
      isVersionAtLeast: () => true,
      setHeaderColor: (color) => {
        calls.push(`header:${color}`);
        if (options.echo) themeParams.header_bg_color = color;
      },
      setBackgroundColor: (color) => void calls.push(`background:${color}`),
      setBottomBarColor: (color) => void calls.push(`bottom:${color}`),
      onEvent: () => undefined,
      offEvent: () => undefined,
    },
  };
  return { calls, themeParams };
}

describe("initTelegramChrome", () => {
  it("фарбує шапку, фон і низ кольорами теми (без повного екрана — шапка лишається)", () => {
    mockTokens({ "--chrome-header-bg": HEADER, "--chrome-bottom-bg": BOTTOM });
    const { calls } = install();

    start();

    expect(calls).toContain("ready");
    expect(calls).toContain(`header:${HEADER}`);
    expect(calls).toContain(`background:${HEADER}`);
    expect(calls).toContain(`bottom:${BOTTOM}`);
    expect(calls).not.toContain("fullscreen");
  });

  it("без токенів у CSS кольорів не шле (розмітка ще не готова) — але повний екран просить", () => {
    mockTokens({});
    const { calls } = install();

    start();

    // Кольорів немає зовсім: у списку лишається тільки `ready`.
    expect(calls).toEqual(["ready"]);
  });

  it("обкладинка фарбує шапку клієнта кольором графіки, а фон лишає теми", () => {
    mockTokens({
      "--chrome-header-bg": HEADER,
      "--chrome-bottom-bg": BOTTOM,
      "--chrome-hero-header-bg": "#a06239",
    });
    document.documentElement.setAttribute("data-chrome", "hero");
    const { calls } = install();

    start();

    expect(calls).toContain("header:#a06239");
    // Фон — тема: його видно на прокрутці за межі обкладинки.
    expect(calls).toContain(`background:${HEADER}`);
    expect(calls).toContain(`bottom:${BOTTOM}`);
  });

  it("на обкладинці низ Mini App — колір нижнього краю кадру, а не смуга теми", () => {
    mockTokens({
      "--chrome-header-bg": HEADER,
      "--chrome-bottom-bg": "#f0f0f4",
      "--chrome-hero-header-bg": "#a06239",
      "--chrome-hero-bottom-bg": "#5e3430",
    });
    document.documentElement.setAttribute("data-chrome", "hero");
    const { calls } = install();

    start();

    // Біла смуга під фото читалась як обрізана шапка.
    expect(calls).toContain("bottom:#5e3430");
  });

  it("шапка екрана йде в тон розділу — тим самим, що й наш хедер і верхівка", () => {
    mockTokens({
      "--chrome-header-bg": HEADER,
      "--chrome-bottom-bg": BOTTOM,
      "--chrome-section-bg": "#dedeeb",
    });
    document.documentElement.setAttribute("data-tone", "4");
    const { calls } = install();

    start();

    expect(calls).toContain("header:#dedeeb");
    // Фон — тема: його видно на прокрутці за межі верхівки.
    expect(calls).toContain(`background:${HEADER}`);
  });

  it("на зміну теми клієнта перечитує токени", () => {
    mockTokens({ "--chrome-header-bg": HEADER, "--chrome-bottom-bg": BOTTOM });
    const { calls, handlers } = install();

    start();
    const before = calls.length;

    expect(handlers.get("themeChanged"), "підписка на тему клієнта").toBeDefined();
    handlers.get("themeChanged")?.();

    expect(calls.length).toBeGreaterThan(before);
    expect(calls.at(-1)).toBe(`bottom:${BOTTOM}`);
  });

  it("відписка знімає підписку на тему клієнта", () => {
    mockTokens({ "--chrome-header-bg": HEADER, "--chrome-bottom-bg": BOTTOM });
    const { calls, handlers } = install();

    const stop = start();
    stop();

    expect(calls).toContain("off:themeChanged");
    expect(handlers.has("themeChanged")).toBe(false);
  });

  it("без `window.Telegram` — no-op, який нічого не ламає", () => {
    mockTokens({ "--chrome-header-bg": HEADER, "--chrome-bottom-bg": BOTTOM });
    delete window.Telegram;

    const stop = start();

    expect(() => stop()).not.toThrow();
  });

  it("публікує вставки клієнта змінними на `<html>`", () => {
    mockTokens({ "--chrome-header-bg": HEADER, "--chrome-bottom-bg": BOTTOM });
    install({
      contentSafeAreaInset: { top: 56, bottom: 12, left: 0, right: 0 },
    });

    start();

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

    start();

    expect(document.documentElement.style.getPropertyValue("--client-inset-top")).toBe("64px");
  });

  it("на зміну вставок клієнта перечитує їх (вхід у повний екран — теж подія)", () => {
    mockTokens({ "--chrome-header-bg": HEADER, "--chrome-bottom-bg": BOTTOM });
    const { app, handlers } = install();

    start();
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

/**
 * Головне правило шапки: наша смуга й шапка клієнта — **одна поверхня**.
 * Тому смуга бере колір, який клієнт назвав своїм, а тон розділу стає
 * кольором лише тоді, коли клієнт підтвердив, що взяв його.
 */
describe("колір шапки від клієнта", () => {
  const SECTION = "#dedeeb";

  function tokens(): void {
    mockTokens({
      "--chrome-header-bg": "#fff8f2",
      "--chrome-bottom-bg": "#fff8f2",
      "--chrome-section-bg": SECTION,
    });
    document.documentElement.setAttribute("data-tone", "4");
  }

  it("клієнт ігнорує setHeaderColor — смуга лишається ЙОГО кольором", async () => {
    vi.useFakeTimers();
    tokens();
    const { calls } = installClient({ header: "#17212b" });

    const stop = start();
    // До будь-якого підтвердження на екрані вже безпечний стан.
    expect(readAppbarColor()).toBe("#17212b");

    await vi.advanceTimersByTimeAsync(500);
    stop();

    expect(readAppbarColor()).toBe("#17212b");
    // Тон таки попросили — але клієнт його не взяв, тож його власний колір і
    // лишився: повторно слати його не треба.
    expect(calls).toContain(`header:${SECTION}`);
    expect(calls).not.toContain("header:#17212b");
  });

  it("клієнт підтвердив колір — смуга стає тоном розділу", async () => {
    vi.useFakeTimers();
    tokens();
    const { calls } = installClient({ header: "#17212b", echo: true });

    const stop = start();
    await vi.advanceTimersByTimeAsync(500);
    stop();

    expect(readAppbarColor()).toBe(SECTION);
    // Повертати клієнту його колір не треба: він узяв наш.
    expect(calls).not.toContain("header:#17212b");
  });

  it("темна шапка клієнта дає світлий підпис, світла — темний", async () => {
    vi.useFakeTimers();
    tokens();
    const ink = () => document.documentElement.style.getPropertyValue("--chrome-appbar-ink");

    // Клієнт без themeParams (старий): працює токен розділу.
    installClient({});
    const stopDark = start();
    await vi.advanceTimersByTimeAsync(500);
    expect(readAppbarColor()).toBe(SECTION); // без themeParams — токен розділу
    stopDark();

    installClient({ header: "#17212b" });
    const stop = start();
    await vi.advanceTimersByTimeAsync(500);
    expect(ink()).toBe("#ffffff");
    stop();

    installClient({ header: "#f6f6f6" });
    const stopLight = start();
    await vi.advanceTimersByTimeAsync(500);
    stopLight();
    expect(ink()).toBe("#1d1a2b");
  });

  it("коли клієнт не має header_bg_color — береться його bg_color", () => {
    const { themeParams } = installClient({ bg: "#f0f0f4" });
    const client = readClientHeader({ themeParams });

    expect(client).toEqual({ color: "#f0f0f4", source: "bg_color" });
  });
});
