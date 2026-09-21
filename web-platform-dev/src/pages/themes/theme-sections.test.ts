/**
 * Розділи теми — те, що ламається мовчки.
 *
 * Тут три речі, яких не видно ні в компіляторі, ні на око:
 * **маршрут** (розділ у списку без адреси — це кнопка, яка веде в нікуди),
 * **друга смуга** (пункт без адреси мовчав би на дотик) і те, що **хаб показує
 * всі розділи**: схований розділ людина знайде тільки вгадавши адресу.
 *
 * @module web-platform-dev/src/pages/themes/theme-sections.test
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { THEME_PATH, THEME_ROUTE, PROFILE_PATH } from "../../app/routes";
import { THEME_QUICK_SECTIONS, THEME_SECTIONS, themeSectionPath } from "./theme-sections";

/** Корінь оболонки — від цього файлу, а не від робочої теки запуску. */
const WORKSPACE_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** Вихідники читаємо як текст: маршрути — це розмітка, а не значення. */
function source(...parts: string[]): string {
  return readFileSync(join(WORKSPACE_ROOT, ...parts), "utf8");
}

describe("адреси теми", () => {
  it("лежать під профілем і складаються з констант", () => {
    expect(THEME_ROUTE).toBe("theme");
    expect(THEME_PATH).toBe(`${PROFILE_PATH}/theme`);
    expect(themeSectionPath("mine")).toBe("/profile/theme/mine");
  });
});

describe("склад розділів", () => {
  it("кожен розділ має підпис, пояснення й унікальний ключ", () => {
    for (const section of THEME_SECTIONS) {
      expect(section.label, section.key).toBeTruthy();
      expect(section.hint, section.key).toBeTruthy();
    }
    const keys = THEME_SECTIONS.map((section) => section.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("у другій смузі стоять саме ті розділи, що позначені `quick`", () => {
    // Смуга — швидкий перехід, а не другий список: якщо пункт зник із неї, це
    // має бути рішенням (`quick: false`), а не наслідком правки фільтра.
    expect(THEME_QUICK_SECTIONS.map((section) => section.key)).toEqual([
      "style",
      "mine",
      "public",
      "customize",
    ]);
    expect(THEME_QUICK_SECTIONS.every((section) => THEME_SECTIONS.includes(section))).toBe(true);
  });

  it("⛔ кожен розділ має маршрут у роутері — інакше кнопка веде в 404", () => {
    const router = source("src", "app", "router.tsx");
    for (const section of THEME_SECTIONS) {
      expect(router, section.key).toContain(`path: "${section.key}"`);
    }
    // І сам каркас розділу: без нього другої смуги на сторінках не буде.
    expect(router).toContain("<ThemeLayout />");
    expect(router).toContain("index: true");
  });
});
