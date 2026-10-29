// @vitest-environment jsdom
/**
 * Схема на `<html>`: **перемикається атрибут, а не стиль**.
 *
 * Хук лишає собі рівно одну річ — світлоту (`data-theme`), бо стиль продукту
 * вибирати не можна. Помилка тут виглядає як «натиснув — нічого не сталось»
 * або як вибір, що не переживає перезавантаження, і в `node`-тестах її не
 * видно: там немає ні `localStorage`, ні `document`.
 *
 * @module packages/shared/src/components/theme/useStyleTheme.dom.test
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useStyleTheme } from "./useStyleTheme";

const THEME_KEY = "wwwuabot-theme";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-colors");
  document.documentElement.removeAttribute("data-colors-mode");
});

describe("useStyleTheme", () => {
  it("без збереженого значення — темна схема", () => {
    const { result } = renderHook(() => useStyleTheme());
    expect(result.current.scheme).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("бере збережену схему й ставить її на `<html>`", () => {
    localStorage.setItem(THEME_KEY, "light");
    const { result } = renderHook(() => useStyleTheme());
    expect(result.current.scheme).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("вибір схеми переживає перезавантаження", () => {
    const { result } = renderHook(() => useStyleTheme());
    act(() => result.current.setScheme("light"));
    expect(localStorage.getItem(THEME_KEY)).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("перемикач міняє схему на протилежну", () => {
    const { result } = renderHook(() => useStyleTheme());
    act(() => result.current.toggleScheme());
    expect(result.current.scheme).toBe("light");
    act(() => result.current.toggleScheme());
    expect(result.current.scheme).toBe("dark");
  });

  it("палітра людини сильніша за схему: перемикач її не перебиває", () => {
    // Саме так екран ставав нечитабельним: на темній палітрі лишалася
    // збережена світла схема, і картка (`--card-bg`) приходила з неї — біла
    // під білим текстом.
    document.documentElement.setAttribute("data-colors", "custom");
    document.documentElement.setAttribute("data-colors-mode", "dark");
    document.documentElement.setAttribute("data-theme", "dark");

    const { result } = renderHook(() => useStyleTheme());
    expect(result.current.scheme).toBe("dark");

    act(() => result.current.setScheme("light"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    // Палітру знято — схема знову має голос.
    document.documentElement.removeAttribute("data-colors");
    document.documentElement.removeAttribute("data-colors-mode");
    act(() => result.current.setScheme("light"));
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});
