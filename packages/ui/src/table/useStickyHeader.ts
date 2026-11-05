/**
 * Вартовий липкої шапки: якщо браузер не тримає `sticky` (рамка з
 * `overflow-x: auto` стає скролпортом і по вертикалі), рамка бере прокрутку
 * на себе — краще обмежена висота, ніж шапка, що їде разом із рядками.
 * @module packages/ui/src/table/useStickyHeader
 */

import { type RefObject, useEffect } from "react";

/** Клас-підстраховка: рамка з власною прокруткою, коли `sticky` не тримається. */
export const STICKY_FALLBACK = "wb-table-scroll--fallback";

/** Допуск: субпіксельні дроблення не роблять шапку «відклеєною». */
const TOLERANCE = 4;

/** Чекаємо, доки прокрутка зупиниться: під час руху шапка відстає на кадр. */
const SETTLE = 120;

export function useStickyHeader(frame: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = frame.current;
    const head = el?.querySelector("thead th");
    if (!el || !head) return;

    let pending: ReturnType<typeof setTimeout> | null = null;
    let done = false;

    /** Те, що гортає сторінку: рамка з `clip` нею не є. */
    const scroller = (): Element | null => {
      for (let node = el.parentElement; node; node = node.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
      }
      return null;
    };

    const check = () => {
      pending = null;
      const area = scroller();
      if (!area) return;
      const edge = area.getBoundingClientRect().top;
      /* Поки рамка нижче краю, липнути нічому — і перевіряти нічого. */
      if (el.getBoundingClientRect().top > edge - 1) return;

      const offset = head.getBoundingClientRect().top - edge;
      if (Math.abs(offset) <= TOLERANCE) return;

      /* Шапка не тримається: підстраховка вмикається раз і назавжди. */
      el.classList.add(STICKY_FALLBACK);
      done = true;
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };

    const onScroll = () => {
      if (done) return;
      if (pending) clearTimeout(pending);
      pending = setTimeout(check, SETTLE);
    };

    check();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (pending) clearTimeout(pending);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };
  }, [frame]);
}
