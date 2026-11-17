// @vitest-environment jsdom
/**
 * Хук теми: вибір діє одразу, переживає перезавантаження й не лишає
 * мертвих атрибутів трьох кольорів.
 *
 * @module packages/shared/src/components/theme/useStyleTheme.dom.test
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useStyleTheme } from "./useStyleTheme";
import { THEME_KEY } from "../../styles/registry";

function theme(): string | null {
  return document.documentElement.getAttribute("data-theme");
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-colors");
  document.documentElement.removeAttribute("data-colors-mode");
});

describe("useStyleTheme", () => {
  it("без вибору починає з ночі", () => {
    const { result } = renderHook(() => useStyleTheme());

    expect(result.current.scheme).toBe("dark");
  });

  it("ставит збережену тему на екран", () => {
    localStorage.setItem(THEME_KEY, "light");

    const { result } = renderHook(() => useStyleTheme());

    expect(result.current.scheme).toBe("light");
    expect(theme()).toBe("light");
  });

  it("вибір застосовується й запамʼятовується одразу", () => {
    const { result } = renderHook(() => useStyleTheme());

    act(() => result.current.setScheme("dark"));

    expect(result.current.scheme).toBe("dark");
    expect(theme()).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
  });

  it("перемикач веде між днем і ніччю", () => {
    const { result } = renderHook(() => useStyleTheme());

    act(() => result.current.toggleScheme());
    expect(theme()).toBe("light");

    act(() => result.current.toggleScheme());
    expect(theme()).toBe("dark");
  });

  it("застосування теми знімає атрибути трьох кольорів", () => {
    document.documentElement.setAttribute("data-colors", "custom");
    document.documentElement.setAttribute("data-colors-mode", "light");

    const { result } = renderHook(() => useStyleTheme());
    act(() => result.current.setScheme("light"));

    expect(document.documentElement.hasAttribute("data-colors")).toBe(false);
    expect(document.documentElement.hasAttribute("data-colors-mode")).toBe(false);
  });
});
