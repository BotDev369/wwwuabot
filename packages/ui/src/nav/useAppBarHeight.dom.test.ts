// @vitest-environment jsdom
/**
 * Висота хедера як токен: **число з екрана, а не з CSS**.
 *
 * `min-height` — підлога: два рядки назви на збільшеному шрифті роблять хедер
 * вищим за `--topbar-h`, і закріплена шапка таблиці заїжджає під нього. Тому
 * перевіряється публікація виміру: хедер виріс — токен виріс; виміру немає —
 * лишається токен.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useAppBarHeight } from "./useAppBarHeight";

/**
 * Хедер, у якого можна спитати висоту й сказати, що вона змінилась.
 *
 * `watch = false` — WebView без `ResizeObserver`: слухача немає, а хедер є.
 */
function stubHeader(watch = true) {
  const watched: (() => void)[] = [];
  let height = 0;

  vi.stubGlobal(
    "ResizeObserver",
    watch
      ? class {
          constructor(callback: () => void) {
            watched.push(callback);
          }
          observe(): void {}
          disconnect(): void {}
        }
      : undefined,
  );

  const header = document.createElement("header");
  header.getBoundingClientRect = () => ({ height }) as DOMRect;

  return {
    header,
    /** Висота без перевиміру — так виглядає перший рендер. */
    show(next: number): void {
      height = next;
    },
    /** Висота, після якої хедер сам себе переміряв (шрифт, назва, safe-area). */
    resize(next: number): void {
      height = next;
      act(() => watched.forEach((callback) => callback()));
    },
  };
}

function published(): string {
  return document.documentElement.style.getPropertyValue("--appbar-h");
}

afterEach(() => {
  document.documentElement.style.removeProperty("--appbar-h");
  vi.unstubAllGlobals();
});

describe("висота хедера як токен", () => {
  it("публікується та, що на екрані", () => {
    const header = stubHeader();
    header.show(74);

    renderHook(() => useAppBarHeight({ current: header.header }));

    expect(published()).toBe("74px");
  });

  it("хедер виріс — токен виріс", () => {
    // Рівно через це токен із CSS не годиться: він про `--topbar-h`, а не про
    // те, скільки хедер займає насправді.
    const header = stubHeader();
    header.show(56);
    renderHook(() => useAppBarHeight({ current: header.header }));
    expect(published()).toBe("56px");

    header.resize(96);

    expect(published()).toBe("96px");
  });

  it("⛔ без `ResizeObserver` (старі WebView) висота все одно публікується", () => {
    // Слухача немає, але перший вимір мусить відбутись: інакше закріплене
    // трималося б токена — тобто найгіршого з можливих значень.
    const header = stubHeader(false);
    header.show(74);

    renderHook(() => useAppBarHeight({ current: header.header }));

    expect(published()).toBe("74px");
  });

  it("⛔ без розкладки нуль не публікується — інакше закріплене тікало б під хедер", () => {
    const header = stubHeader();

    renderHook(() => useAppBarHeight({ current: header.header }));

    expect(published()).toBe("");
  });

  it("хедер зник — токен повертається до значення з CSS", () => {
    const header = stubHeader();
    header.show(74);
    const view = renderHook(() => useAppBarHeight({ current: header.header }));
    expect(published()).toBe("74px");

    view.unmount();

    expect(published()).toBe("");
  });
});
