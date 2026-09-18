/**
 * Вибір розкладки карток у сховищі пристрою — і варіанти, з яких його роблять.
 *
 * Перевіряємо те, що ламається тихо: **типове значення**, коли сховища немає (у
 * Mini App WebView воно буває заблоковане, і падіння тут зламало б усе меню
 * профілю), те, що вибір справді вертається назад (інакше перемикач показував би
 * одне, а картки стояли б по-іншому), і те, що в перемикача рівно два варіанти з
 * **різними** знаками та непорожніми іменами — знак без імені не сказав би, що
 * він робить, а однакові знаки — чим варіанти різняться.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CARDS_LAYOUT_OPTIONS,
  DEFAULT_CARDS_LAYOUT,
  readCardsLayout,
  writeCardsLayout,
} from "./profile-cards-pref";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("розкладка карток меню профілю", () => {
  it("рівно два варіанти, і в кожного є ім'я та свій знак", () => {
    expect(CARDS_LAYOUT_OPTIONS.map((option) => option.key)).toEqual(["portrait", "horizontal"]);
    expect(DEFAULT_CARDS_LAYOUT).toBe("portrait");

    const icons = CARDS_LAYOUT_OPTIONS.map((option) => option.icon);
    expect(new Set(icons).size).toBe(icons.length);
    for (const option of CARDS_LAYOUT_OPTIONS) expect(option.label.trim(), option.key).toBeTruthy();
  });

  it("без сховища — типове, а не помилка", () => {
    // `environment: node`, тож localStorage тут і справді немає.
    expect(readCardsLayout()).toBe("portrait");
    expect(() => writeCardsLayout("horizontal")).not.toThrow();
  });

  it("вибір вертається назад зі сховища", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });

    writeCardsLayout("horizontal");
    expect(readCardsLayout()).toBe("horizontal");
    writeCardsLayout("portrait");
    expect(readCardsLayout()).toBe("portrait");
  });

  it("сміття в сховищі читається як типове", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "щось інше",
      setItem: () => {},
    });
    expect(readCardsLayout()).toBe("portrait");
  });
});
