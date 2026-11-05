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

/** Крок пробної прокрутки: достатньо, щоб побачити, чи шапка поїхала. */
const PROBE_STEP = 24;

/** Чекаємо, доки прокрутка зупиниться: під час руху шапка відстає на кадр. */
const SETTLE = 120;

export function useStickyHeader(frame: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = frame.current;
    const head = el?.querySelector<HTMLElement>("thead th");
    if (!el || !head) return;

    let pending: ReturnType<typeof setTimeout> | null = null;
    let done = false;
    let probing = false;

    /** Те, що гортає сторінку: рамка з `clip` нею не є. */
    const scroller = (): HTMLElement | null => {
      for (let node = el.parentElement; node; node = node.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(node).overflowY)) return node as HTMLElement;
      }
      return null;
    };

    /**
     * Чи справді не тримається.
     *
     * Ніяких припущень про геометрію: пробно прокручуємо скролер і питаємо
     * саму шапку, чи вона лишилась на місці. Один такий замір відповідає
     * рівно на те питання, яке нас цікавить, — і не бреше ні під час
     * розкриття панелі, ні на короткій таблиці.
     */
    const broken = (): boolean => {
      const area = scroller();
      if (!area) return false;

      const edge = area.getBoundingClientRect().top;
      /* Поки рамка нижче краю, липнути нічому — і перевіряти нічого. */
      if (el.getBoundingClientRect().top > edge - 1) return false;

      const table = el.querySelector("table");
      if (!table) return false;
      /* Кінець таблиці ближче за крок проби до краю: шапка відпускається
         законно, і зсув «поїхала» нічого не доводить. */
      if (table.getBoundingClientRect().bottom <= edge + PROBE_STEP + head.offsetHeight)
        return false;

      /* Між рамкою і скролером стоїть `overflow: hidden` — він стає
         скролпортом для `sticky`. Але підстраховка цього не лікує, вона лише
         ховає шапку разом із рамкою. Хай дефект буде видно, а не замасковано
         іншим дефектом. */
      for (let node = el.parentElement; node && node !== area; node = node.parentElement) {
        if (/(hidden|clip)/.test(getComputedStyle(node).overflowY)) return false;
      }

      const restore = area.scrollTop;
      probing = true;
      try {
        area.scrollTop = restore + PROBE_STEP;
        /* Скролер уже в кінці — пробна прокрутка нічого не зсуне, і замір
           нічого не скаже. */
        if (area.scrollTop === restore) return false;
        /* Після прокрутки шапка мусить стояти на краї; якщо вона поїхала
           вгору на крок — `sticky` тут не тримається. */
        const moved = head.getBoundingClientRect().top;
        return Math.abs(moved - edge) > TOLERANCE;
      } finally {
        area.scrollTop = restore;
        probing = false;
      }
    };

    const engage = () => {
      if (done || !broken()) return;
      el.classList.add(STICKY_FALLBACK);
      done = true;
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
    };

    const check = () => {
      pending = null;
      if (!broken()) return;
      /* Другий замір після паузи: перший може збігтися з перебудовою. */
      pending = setTimeout(engage, SETTLE);
    };

    const onScroll = () => {
      if (done || probing) return;
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
