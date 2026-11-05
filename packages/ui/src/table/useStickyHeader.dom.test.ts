// @vitest-environment jsdom
/**
 * Вартовий липкої шапки: коли браузер не тримає `sticky`, рамка переходить
 * на власну прокрутку — краще так, ніж шапка, що їде разом із рядками.
 *
 * @module packages/ui/src/table/useStickyHeader.dom.test
 */

import { act, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STICKY_FALLBACK, useStickyHeader } from "./useStickyHeader";

/** Рамка з таблицею; `headTop` — де шапка опинилась після прокрутки. */
function mount(headTop: number, frameTop = -400) {
  const area = document.createElement("section");
  area.style.overflowY = "auto";
  const frame = document.createElement("div");
  frame.className = "wb-table-scroll";
  frame.innerHTML = "<table><thead><tr><th>Колонка</th></tr></thead></table>";
  area.append(frame);
  document.body.append(area);

  area.getBoundingClientRect = () => ({ top: 0, bottom: 700, left: 0, right: 400 }) as DOMRect;
  frame.getBoundingClientRect = () =>
    ({ top: frameTop, bottom: frameTop + 1300, left: 0, right: 400 }) as DOMRect;
  const head = frame.querySelector("th") as HTMLElement;
  head.getBoundingClientRect = () =>
    ({ top: headTop, bottom: headTop + 40, left: 0, right: 0 }) as DOMRect;

  return frame;
}

function hook(frame: HTMLElement) {
  const ref = createRef<HTMLElement>();
  ref.current = frame;
  renderHook(() => useStickyHeader(ref));
  act(() => {
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(200);
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useStickyHeader", () => {
  it("шапка липне — підстраховка не потрібна", () => {
    const frame = mount(0);
    hook(frame);

    expect(frame.classList.contains(STICKY_FALLBACK)).toBe(false);
  });

  it("шапку не зсуває: жодних від'ємних top, під якими вона ховається", () => {
    const frame = mount(0);
    hook(frame);

    expect(frame.style.getPropertyValue("--wb-table-stick-top")).toBe("");
    expect(frame.getAttribute("style")).toBeNull();
  });

  it("шапка поїхала з рядками — рамка бере прокрутку на себе", () => {
    const frame = mount(-400);
    hook(frame);

    expect(frame.classList.contains(STICKY_FALLBACK)).toBe(true);
  });

  it("поки таблиця нижче краю, нічого не вирішується", () => {
    const frame = mount(-400, 300);
    hook(frame);

    expect(frame.classList.contains(STICKY_FALLBACK)).toBe(false);
  });

  it("дроблення на пів пікселя — ще не відклеєна шапка", () => {
    const frame = mount(1);
    hook(frame);

    expect(frame.classList.contains(STICKY_FALLBACK)).toBe(false);
  });
});
