/**
 * Розділи теми — те, що ламається мовчки.
 *
 * Тут чотири речі, яких не видно ні в компіляторі, ні на око:
 * **маршрут** (розділ у списку без адреси — це кнопка, яка веде в нікуди),
 * **склад** (три пункти, і саме ті, які людина знає словами «стиль», «готові
 * теми», «налаштувати»), **друга смуга** (пункт без адреси мовчав би на дотик)
 * і те, що **другий рядок пункту — стан**, а не пояснення розділу.
 *
 * @module web-platform-dev/src/pages/themes/theme-sections.test
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { THEME_PATH, THEME_ROUTE, PROFILE_PATH } from "../../app/routes";
import { THEME_SECTIONS, themeSectionPath } from "./theme-sections";

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
    expect(themeSectionPath("presets")).toBe("/profile/theme/presets");
  });
});

describe("склад розділів", () => {
  it("їх три, і вони названі словами людини", () => {
    // «Схема» — наше внутрішнє слово (`ThemeScheme`); у продукті сутність
    // зветься **тема**, бо саме це слово людина вживає. Підписи короткі: вони
    // стоять у смузі, де на пункт — близько сотні пікселів.
    expect(THEME_SECTIONS.map((section) => section.label)).toEqual([
      "Стиль",
      "Готові теми",
      "Налаштувати",
    ]);
  });

  it("заголовок сторінки налаштувань каже повну назву", () => {
    // Пункт навігації — дієслово, а сторінка називається повністю: саме тут
    // людина бачить, що налаштовує **тему**.
    expect(source("src", "pages", "themes", "ThemeCustomizePage.tsx")).toContain(
      '"Налаштувати тему"',
    );
  });

  it("кожен розділ має унікальний ключ, підпис і знак", () => {
    for (const section of THEME_SECTIONS) {
      expect(section.label, section.key).toBeTruthy();
      expect(section.icon, section.key).toBeTruthy();
    }
    const keys = THEME_SECTIONS.map((section) => section.key);
    expect(new Set(keys).size).toBe(keys.length);
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

  it("у роутері немає розділів, знятих із хабу", () => {
    // Знятий маршрут лишається живим за посиланням: сторінки під ним більше
    // немає, і людина побачила б порожній екран замість 404.
    const router = source("src", "app", "router.tsx");
    expect(router).not.toContain('path: "mine"');
    expect(router).not.toContain('path: "public"');
  });

  it("друга смуга бере пункти з того самого списку", () => {
    // Пункт смуги, якого немає серед сторінок розділу, — кнопка в нікуди;
    // друга копія складу розійшлася б із першою на першій же правці.
    expect(source("src", "layout", "ThemeSubBar.tsx")).toContain("THEME_SECTIONS");
  });

  it("другий рядок пункту хабу — стан, а не пояснення розділу", () => {
    // Пояснення («Характер продукту: Apple чи Material») читають один раз, а
    // стан потрібен щоразу: хаб і є місцем, де дивляться, що вибрано.
    const hub = source("src", "pages", "themes", "ThemeHubPage.tsx");
    expect(hub).toContain("useThemeLook");
    // Рядок рендерить **спільний сайдбар**, а стан їде в нього полем `hint`: у
    // розділів теми більше немає власних класів під рядок.
    expect(hub).toContain("SideBarMenu");
    expect(hub).toContain("hint: valueOf(section.key)");
  });
});
