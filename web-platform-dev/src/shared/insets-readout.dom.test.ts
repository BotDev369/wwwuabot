// @vitest-environment jsdom
/**
 * Смужка з числами вставок — тимчасовий інструмент. Тест фіксує те, чим вона
 * корисна й чим не має заважати: показує прислані клієнтом числа, стоїть
 * **унизу** і знімається першим дотиком.
 *
 * @module web-platform-dev/src/shared/insets-readout.dom.test
 */

import { afterEach, describe, expect, it } from "vitest";
import type { TelegramWebApp } from "@wwwuabot/shared/types/telegram";
import { mountInsetsReadout } from "./insets-readout";

function install(over: Partial<TelegramWebApp> = {}): void {
  window.Telegram = { WebApp: { setHeaderColor: () => undefined, ...over } };
}

function box(): HTMLElement | null {
  return document.querySelector("pre");
}

afterEach(() => {
  document.body.innerHTML = "";
  delete window.Telegram;
});

describe("mountInsetsReadout", () => {
  it("без Telegram WebApp не малює нічого", () => {
    mountInsetsReadout();
    expect(box()).toBeNull();
  });

  it("показує платформу, повний екран і вставки клієнта — і стоїть унизу", () => {
    install({
      platform: "android",
      isFullscreen: true,
      safeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
      contentSafeAreaInset: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    mountInsetsReadout();

    const text = box()?.textContent ?? "";
    expect(text).toContain("android");
    expect(text).toContain("full=true");
    expect(text).toContain("safeArea t=0 b=0");
    expect(box()?.style.bottom).toBe("0px");

    window.dispatchEvent(new Event("touchstart"));
  });

  it("знімається першим дотиком", () => {
    install({ platform: "ios" });

    mountInsetsReadout();
    expect(box()).not.toBeNull();

    window.dispatchEvent(new Event("touchstart"));
    expect(box()).toBeNull();
  });
});
