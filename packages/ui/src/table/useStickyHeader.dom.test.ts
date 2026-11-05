// @vitest-environment jsdom
/**
 * Вартовий липкої шапки: коли браузер не тримає `sticky`, рамка переходить
 * на власну прокрутку — краще так, ніж шапка, що їде разом із рядками.
 *
 * @module packages/ui/src/table/useStickyHeader.dom.test
 */

import { act, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { STICKY_FALLBACK, useStickyHeader } from "./useStickyHeader";

/** Рамка з таблицею; `headTop` — де шапка опинилась після прокрутки. */
function mount(headTop: number, padding = "0px") {
  const area = document.createElement("section");
  area.style.overflowY = "auto";
  area.style.paddingTop = padding;
  const frame = document.createElement("div");
  frame.className = "wb-table-scroll";
  frame.innerHTML = "<table><thead><tr><th>Колонка</th></tr></thead></table>";
  area.append(frame);
  document.body.append(area);

  area.getBoundingClientRect = () => ({ top: 0, bottom: 700, left: 0, right: 400 }) as DOMRect;
  frame.getBoundingClientRect = () => ({ top: -400, bottom: 900, left: 0, right: 400 }) as DOMRect;
  const head = frame.querySelector("th") as HTMLElement;
  head.getBoundingClientRect = () =>
    ({ top: headTop, bottom: headTop + 40, left: 0, right: 0 }) as DOMRect;

  return frame;
}

describe("useStickyHeader", () => {
  it("точка прилипання зсувається на відступ контейнера", () => {
    const frame = mount(0, "12px");
    const ref = createRef<HTMLElement>();
    ref.current = frame;

    renderHook(() => useStickyHeader(ref));

    expect(frame.style.getPropertyValue("--wb-table-stick-top")).toBe("-12px");
  });

  it("зсув не більший за висоту шапки — вона не поїде за екран", () => {
    const frame = mount(0, "120px");
    const ref = createRef<HTMLElement>();
    ref.current = frame;

    renderHook(() => useStickyHeader(ref));

    expect(frame.style.getPropertyValue("--wb-table-stick-top")).toBe("-24px");
  });

  it("шапка липне — підстраховка не потрібна", () => {
    const frame = mount(0);
    const ref = createRef<HTMLElement>();
    ref.current = frame;

    renderHook(() => useStickyHeader(ref));
    act(() => void window.dispatchEvent(new Event("scroll")));

    expect(frame.classList.contains(STICKY_FALLBACK)).toBe(false);
  });

  it("шапка поїхала з рядками — рамка бере прокрутку на себе", () => {
    const frame = mount(-400);
    const ref = createRef<HTMLElement>();
    ref.current = frame;

    renderHook(() => useStickyHeader(ref));
    act(() => void window.dispatchEvent(new Event("scroll")));

    expect(frame.classList.contains(STICKY_FALLBACK)).toBe(true);
  });

  it("поки таблиця нижче краю, нічого не вирішується", () => {
    const frame = mount(-400);
    frame.getBoundingClientRect = () => ({ top: 300, bottom: 900, left: 0, right: 400 }) as DOMRect;
    const ref = createRef<HTMLElement>();
    ref.current = frame;

    renderHook(() => useStickyHeader(ref));
    act(() => void window.dispatchEvent(new Event("scroll")));

    expect(frame.classList.contains(STICKY_FALLBACK)).toBe(false);
  });
});
