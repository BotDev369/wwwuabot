/**
 * Шапка липне під `padding-top` того, що гортає сторінку, і над нею лишається
 * смуга з рядками, що проїжджають. Хук міряє відступ і віддає його змінною
 * `--wb-table-stick-top` з мінусом. Деталі — docs/DESIGN_SYSTEM.md §27.
 *
 * @module packages/ui/src/table/useStickTop
 */

import { type RefObject, useLayoutEffect } from "react";

/** Найближчий предок, який справді гортає вміст по вертикалі. */
function scrollParent(from: HTMLElement): HTMLElement | null {
  let node = from.parentElement;
  while (node) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY)) return node;
    node = node.parentElement;
  }
  return null;
}

export function useStickTop(ref: RefObject<HTMLElement | null>): void {
  useLayoutEffect(() => {
    const frame = ref.current;
    if (!frame) return;

    const apply = () => {
      /* Обмежена по висоті рамка (прев'ю в картці) гортає себе сама — там
         шапка липне до її власного верху, без зсуву. */
      const self = getComputedStyle(frame).overflowY;
      const parent = /(auto|scroll)/.test(self) ? null : scrollParent(frame);
      const pad = parent ? Number.parseFloat(getComputedStyle(parent).paddingTop) || 0 : 0;
      frame.style.setProperty("--wb-table-stick-top", pad > 0 ? `-${pad}px` : "0px");
    };

    apply();
    /* Без `ResizeObserver` (старі WebView, jsdom) вимір усе одно відбувається:
       відступ читається з CSS, а не з геометрії. */
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(apply);
    observer?.observe(frame);
    if (frame.parentElement) observer?.observe(frame.parentElement);
    window.addEventListener("resize", apply);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", apply);
    };
  }, [ref]);
}
