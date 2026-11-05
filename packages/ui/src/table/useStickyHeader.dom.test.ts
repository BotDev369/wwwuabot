// @vitest-environment jsdom
/**
 * Вартовий липкої шапки: коли браузер не тримає `sticky`, рамка переходить
 * на власну прокрутку — краще так, ніж шапка, що їде разом із рядками.
 *
 * Перевірка — не «де шапка зараз», а «чи вона поїхала, коли прокрутили»:
 * геометрія під час розкриття панелі бреше, а рух — ні.
 *
 * @module packages/ui/src/table/useStickyHeader.dom.test
 */

import { act, renderHook } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STICKY_FALLBACK, useStickyHeader } from "./useStickyHeader";

/** Верх шапки у вмісті сторінки — далеко, щоб таблиця перетинала край. */
const HEAD_TOP = 1000;
/** Низ таблиці у вмісті. */
const TABLE_BOTTOM = 1600;
/** Поточна прокрутка: шапка вже вище краю. */
const SCROLL = 1100;

interface MountOptions {
  /** `true` — шапка липне; `false` — їде разом із рядками. */
  sticky?: boolean;
  /** Верх рамки у в'юпорті (типово — вище краю). */
  frameTop?: number;
  /** Обгортка з `overflow: hidden` між рамкою і скролером. */
  clipped?: boolean;
  /** Прокрутки немає — скролер уже в кінці. */
  noRoom?: boolean;
}

function mount({
  sticky = true,
  frameTop = -400,
  clipped = false,
  noRoom = false,
}: MountOptions = {}) {
  const area = document.createElement("section");
  area.style.overflowY = "auto";
  let scrollTop = SCROLL;
  Object.defineProperty(area, "scrollTop", {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => {
      if (!noRoom) scrollTop = value;
    },
  });
  area.getBoundingClientRect = () => ({ top: 0, bottom: 700, left: 0, right: 400 }) as DOMRect;

  const frame = document.createElement("div");
  frame.className = "wb-table-scroll";
  frame.innerHTML = "<table><thead><tr><th>Колонка</th></tr></thead></table>";

  const wrapper = document.createElement("div");
  if (clipped) wrapper.style.overflowY = "hidden";
  wrapper.append(frame);
  area.append(wrapper);
  document.body.append(area);

  frame.getBoundingClientRect = () =>
    ({ top: frameTop, bottom: frameTop + TABLE_BOTTOM - HEAD_TOP, left: 0, right: 400 }) as DOMRect;
  const table = frame.querySelector("table") as HTMLElement;
  table.getBoundingClientRect = () =>
    ({ top: frameTop, bottom: TABLE_BOTTOM - scrollTop, left: 0, right: 400 }) as DOMRect;

  const head = frame.querySelector("th") as HTMLElement;
  head.getBoundingClientRect = () => {
    const top = sticky ? 0 : HEAD_TOP - scrollTop;
    return { top, bottom: top + 40, left: 0, right: 0 } as DOMRect;
  };

  return frame;
}

function hook(frame: HTMLElement) {
  const ref = createRef<HTMLElement>();
  ref.current = frame;
  renderHook(() => useStickyHeader(ref));
  act(() => {
    window.dispatchEvent(new Event("scroll"));
    vi.advanceTimersByTime(500);
  });
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useStickyHeader", () => {
  it("шапка липне — підстраховка не потрібна", () => {
    const frame = mount({ sticky: true });
    hook(frame);

    expect(frame.classList.contains(STICKY_FALLBACK)).toBe(false);
  });

  it("шапка поїхала разом із рядками — рамка бере прокрутку на себе", () => {
    const frame = mount({ sticky: false });
    hook(frame);

    expect(frame.classList.contains(STICKY_FALLBACK)).toBe(true);
  });

  it("жодних від'ємних top: шапку не зсувають, щоб вона трималась", () => {
    const frame = mount({ sticky: true });
    hook(frame);

    expect(frame.getAttribute("style")).toBeNull();
  });

  it("поки таблиця нижче краю, нічого не вирішується", () => {
    const frame = mount({ sticky: false, frameTop: 300 });
    hook(frame);

    expect(frame.classList.contains(STICKY_FALLBACK)).toBe(false);
  });

  it("таблиця вже скінчилась вище краю — шапка відпустилась законно", () => {
    const frame = mount({ sticky: false });
    const table = frame.querySelector("table") as HTMLElement;
    table.getBoundingClientRect = () =>
      ({ top: -900, bottom: -60, left: 0, right: 400 }) as DOMRect;
    hook(frame);

    expect(frame.classList.contains(STICKY_FALLBACK)).toBe(false);
  });

  it("скролер у кінці — пробна прокрутка нічого не доводить", () => {
    const frame = mount({ sticky: false, noRoom: true });
    hook(frame);

    expect(frame.classList.contains(STICKY_FALLBACK)).toBe(false);
  });

  it("`overflow: hidden` між рамкою і скролером — це дефект розмітки, не привід для підстраховки", () => {
    const frame = mount({ sticky: false, clipped: true });
    hook(frame);

    expect(frame.classList.contains(STICKY_FALLBACK)).toBe(false);
  });
});
