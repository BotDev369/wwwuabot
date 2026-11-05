/**
 * Вартовий липкої шапки. Дає дві речі: зсув точки прилипання на `padding-top`
 * того, що гортає сторінку (інакше над шапкою лишається смуга з рядками), і
 * підстраховку, коли браузер узагалі не тримає `sticky` — тоді рамка бере
 * прокрутку на себе, аби шапка була видима.
 * @module packages/ui/src/table/useStickyHeader
 */

import { type RefObject, useEffect } from "react";

/** Клас-підстраховка: рамка з власною прокруткою, коли `sticky` не тримається. */
export const STICKY_FALLBACK = "wb-table-scroll--fallback";

/** Більше за це шапку вгору не зсуваємо: інакше вона сама поїде за екран. */
const MAX_SHIFT = 24;

export function useStickyHeader(frame: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = frame.current;
    const head = el?.querySelector("thead th");
    if (!el || !head) return;

    let pending = 0;
    let done = false;

    const scroller = (): Element | null => {
      for (let node = el.parentElement; node; node = node.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node;
      }
      return null;
    };

    /** Точка прилипання: мінус відступ контейнера, але не більше за `MAX_SHIFT`. */
    const shift = () => {
      const area = scroller();
      const own = getComputedStyle(el).overflowY;
      const pad = area && !/(auto|scroll)/.test(own) ? getComputedStyle(area).paddingTop : "";
      const value = Math.min(Number.parseFloat(pad) || 0, MAX_SHIFT);
      el.style.setProperty("--wb-table-stick-top", value > 0 ? `-${value}px` : "0px");
    };

    const check = () => {
      pending = 0;
      const area = scroller();
      if (!area) return;
      const edge = area.getBoundingClientRect().top;
      /* Поки рамка нижче краю, липнути нічому — і перевіряти нічого. */
      if (el.getBoundingClientRect().top > edge - 1) return;

      const offset = head.getBoundingClientRect().top - edge;
      if (Math.abs(offset) <= 2) return;

      /* Шапка не тримається: підстраховка вмикається раз і назавжди. */
      el.classList.add(STICKY_FALLBACK);
      done = true;
      el.style.setProperty("--wb-table-stick-top", "0px");
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
    };

    const onScroll = () => {
      if (done || pending) return;
      pending = requestAnimationFrame(check);
    };

    const onResize = () => {
      shift();
      onScroll();
    };

    shift();
    check();
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onResize);

    return () => {
      if (pending) cancelAnimationFrame(pending);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
    };
  }, [frame]);
}
