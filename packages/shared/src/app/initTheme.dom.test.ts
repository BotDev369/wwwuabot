// @vitest-environment jsdom
/**
 * Старт застосунку: **схема на `<html>`, і жодного вибору стилю**.
 *
 * `initTheme()` стоїть у `main.tsx` обох оболонок до першого рендера, тож його
 * помилка видна як миготіння екрана, а не як падіння: схема не встигла — і
 * людина бачить світлий екран у темній схемі. Тут перевіряється те, що інакше
 * ловиться лише очима: атрибут схеми, типове значення, прибирання мертвих
 * ключів і **відсутність** атрибута стилю — стиль один, вибирати нема чого.
 *
 * @module packages/shared/src/app/initTheme.dom.test
 */

import { beforeEach, describe, expect, it } from "vitest";
import { initTheme } from "./initTheme";

const THEME_KEY = "wwwuabot-theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-brand");
});

describe("initTheme", () => {
  it("ставить збережену схему", () => {
    localStorage.setItem(THEME_KEY, "light");
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("без збереженого значення — темна, а не «системна»", () => {
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("сміття в памʼяті не робить схему невідомою", () => {
    localStorage.setItem(THEME_KEY, "sepia");
    initTheme();
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("прибирає мертві ключі вибору стилю", () => {
    localStorage.setItem("wwwuabot-brand", "apple");
    localStorage.setItem("wwwuabot-style", "material");
    initTheme();
    expect(localStorage.getItem("wwwuabot-brand")).toBeNull();
    expect(localStorage.getItem("wwwuabot-style")).toBeNull();
  });

  it("не ставить атрибут вибору стилю: стиль один", () => {
    initTheme();
    expect(document.documentElement.hasAttribute("data-brand")).toBe(false);
  });
});
