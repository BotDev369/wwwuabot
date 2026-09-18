/**
 * Вибір розкладки карток у сховищі пристрою.
 *
 * Перевіряємо дві речі, які ламаються тихо: **типове значення**, коли сховища
 * немає (у Mini App WebView воно буває заблоковане, і падіння тут зламало б
 * усе меню профілю), і те, що вибір справді вертається назад — інакше
 * перемикач показував би одне, а картки стояли б по-іншому.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { readAccountCardsLayout, writeAccountCardsLayout } from "./profile-cards-pref";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("вибір розкладки карток", () => {
  it("без сховища — типове, а не помилка", () => {
    // `environment: node`, тож localStorage тут і справді немає.
    expect(readAccountCardsLayout()).toBe("portrait");
    expect(() => writeAccountCardsLayout("horizontal")).not.toThrow();
  });

  it("вибір вертається назад зі сховища", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });

    writeAccountCardsLayout("horizontal");
    expect(readAccountCardsLayout()).toBe("horizontal");
    writeAccountCardsLayout("portrait");
    expect(readAccountCardsLayout()).toBe("portrait");
  });

  it("сміття в сховищі читається як типове", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "щось інше",
      setItem: () => {},
    });
    expect(readAccountCardsLayout()).toBe("portrait");
  });
});
