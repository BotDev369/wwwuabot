// @vitest-environment jsdom
/**
 * Старт застосунку: тема стоїть на `<html>` до першого рендера.
 *
 * Перевіряємо те, що видно очима: збережений вибір переживає перезавантаження,
 * сміття від старої моделі не ламає старт, а мертві ключі прибираються, щоб
 * прибрана механіка не поверталась із памʼяті пристрою.
 *
 * @module packages/shared/src/app/initTheme.dom.test
 */

import { beforeEach, describe, expect, it } from "vitest";
import { initTheme } from "./initTheme";
import { THEME_KEY } from "../styles/registry";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-colors");
  document.documentElement.removeAttribute("data-colors-mode");
});

describe("initTheme", () => {
  it("ставить збережену тему", () => {
    localStorage.setItem(THEME_KEY, "ocean");

    initTheme();

    expect(document.documentElement.getAttribute("data-theme")).toBe("ocean");
  });

  it("без вибору відкриває ніч", () => {
    initTheme();

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("невідоме значення не ламає старт", () => {
    localStorage.setItem(THEME_KEY, "не-тема");

    initTheme();

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("прибирає ключі трьох кольорів і стилю", () => {
    localStorage.setItem("wwwuabot-colors", '{"bg":"#000"}');
    localStorage.setItem("wwwuabot-font", "lora");
    localStorage.setItem("wwwuabot-brand", "android");

    initTheme();

    expect(localStorage.getItem("wwwuabot-colors")).toBeNull();
    expect(localStorage.getItem("wwwuabot-font")).toBeNull();
    expect(localStorage.getItem("wwwuabot-brand")).toBeNull();
  });

  it("знімає атрибути трьох кольорів, якщо вони лишились на сторінці", () => {
    document.documentElement.setAttribute("data-colors", "custom");
    document.documentElement.setAttribute("data-colors-mode", "dark");

    initTheme();

    expect(document.documentElement.hasAttribute("data-colors")).toBe(false);
    expect(document.documentElement.hasAttribute("data-colors-mode")).toBe(false);
  });
});
