// @vitest-environment jsdom
/**
 * Точка прилипання шапки: `sticky` липне під `padding-top` того, що гортає
 * сторінку. Якщо цей відступ не віддати мінусом, над шапкою лишається смуга,
 * у якій видно рядки, що проїжджають, — саме та вада, яку хук і закриває.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useStickTop } from "./useStickTop";

/** Скрол-контейнер зі своїм відступом і таблиця всередині нього. */
function mountScroller(paddingTop: number, overflowY = "auto") {
  const scroller = document.createElement("div");
  scroller.style.overflowY = overflowY;
  scroller.style.paddingTop = `${paddingTop}px`;

  const frame = document.createElement("div");
  scroller.append(frame);
  document.body.append(scroller);

  return { scroller, frame };
}

function stubResize() {
  const watched: (() => void)[] = [];
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        watched.push(callback);
      }
      observe(): void {}
      disconnect(): void {}
    },
  );
  return {
    resize(): void {
      act(() => watched.forEach((callback) => callback()));
    },
  };
}

function published(frame: HTMLElement): string {
  return frame.style.getPropertyValue("--wb-table-stick-top");
}

afterEach(() => {
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("точка прилипання шапки таблиці", () => {
  it("відступ контейнера віддається мінусом", () => {
    stubResize();
    const { frame } = mountScroller(12);

    renderHook(() => useStickTop({ current: frame }));

    expect(published(frame)).toBe("-12px");
  });

  it("без відступу лишається нуль", () => {
    stubResize();
    const { frame } = mountScroller(0);

    renderHook(() => useStickTop({ current: frame }));

    expect(published(frame)).toBe("0px");
  });

  it("⛔ контейнер, що не гортає, не вважається скролом", () => {
    stubResize();
    const { frame } = mountScroller(24, "visible");

    renderHook(() => useStickTop({ current: frame }));

    expect(published(frame)).toBe("0px");
  });

  it("⛔ обмежена рамка гортає себе — зсув не потрібен", () => {
    stubResize();
    const { frame } = mountScroller(12);
    frame.style.overflowY = "auto";

    renderHook(() => useStickTop({ current: frame }));

    expect(published(frame)).toBe("0px");
  });

  it("⛔ без `ResizeObserver` відступ усе одно віддається", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const { frame } = mountScroller(16);

    renderHook(() => useStickTop({ current: frame }));

    expect(published(frame)).toBe("-16px");
  });

  it("брейкпойнт змінив відступ — змінилось і прилипання", () => {
    const resize = stubResize();
    const { scroller, frame } = mountScroller(12);
    renderHook(() => useStickTop({ current: frame }));
    expect(published(frame)).toBe("-12px");

    scroller.style.paddingTop = "20px";
    resize.resize();

    expect(published(frame)).toBe("-20px");
  });
});
