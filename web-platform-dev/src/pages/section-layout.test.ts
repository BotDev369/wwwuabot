/**
 * Вибір вигляду списку — те, що ламається тихо.
 *
 * Вибір лежить у сховищі пристрою, а екран перемонтовується на кожному
 * переході: якщо читання звіряє значення лише з одним варіантом або падає на
 * недоступному `localStorage`, людина обирає плитки, а бачить рядки — і ніде
 * про це не сказано.
 *
 * @module web-platform-dev/src/pages/section-layout.test
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SECTIONS_LAYOUT,
  SECTIONS_LAYOUT_OPTIONS,
  readSectionsLayout,
  writeSectionsLayout,
} from "./section-layout";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("вибір вигляду списку", () => {
  it("рівно два варіанти, і в кожного є ім'я та свій знак", () => {
    // Типовий варіант стоїть першим: у смузі лівіше — те, що людина побачить,
    // якщо нічого не чіпатиме.
    expect(SECTIONS_LAYOUT_OPTIONS.map((option) => option.key)).toEqual(["rows", "blocks"]);
    expect(DEFAULT_SECTIONS_LAYOUT).toBe("rows");
    expect(SECTIONS_LAYOUT_OPTIONS[0].key).toBe(DEFAULT_SECTIONS_LAYOUT);

    const icons = SECTIONS_LAYOUT_OPTIONS.map((option) => option.icon);
    expect(new Set(icons).size).toBe(icons.length);
    for (const option of SECTIONS_LAYOUT_OPTIONS)
      expect(option.label.trim(), option.key).toBeTruthy();
  });

  it("без сховища — типове, а не помилка", () => {
    // `environment: node`, тож localStorage тут і справді немає: у WebView
    // Telegram він теж буває заблокований, і падіння зламало б увесь хаб.
    expect(readSectionsLayout()).toBe(DEFAULT_SECTIONS_LAYOUT);
    expect(() => writeSectionsLayout("rows")).not.toThrow();
  });

  it("вибір переживає перемонтування екрана", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    });

    writeSectionsLayout("rows");
    expect(readSectionsLayout()).toBe("rows");
    writeSectionsLayout("blocks");
    expect(readSectionsLayout()).toBe("blocks");
  });

  it("сміття у сховищі дає типовий вигляд, а не помилку", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "портрет",
      setItem: () => {},
    });
    expect(readSectionsLayout()).toBe(DEFAULT_SECTIONS_LAYOUT);
  });
});
