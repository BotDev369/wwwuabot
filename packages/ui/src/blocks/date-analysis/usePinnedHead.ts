/**
 * Закріплена шапка аналізу: копія окремою смугою над тілом — усередині
 * таблиці її не закріпити. Закріплене тримається краю того, хто скролить
 * (`DESIGN_SYSTEM` §27), а тіло гортає себе вбік — і контейнер скролу гортає в
 * обох осях: `overflow-x` тягне `overflow-y`, тоді як порізаний `overflow`
 * лишає стару поведінку (WebKit у Telegram). Ширини обох таблиць міряються
 * разом і публікуються спільним `<colgroup>`, бо вміст у них різний.
 */

import { useCallback, useLayoutEffect, useRef, useState, type RefObject } from "react";

export interface PinnedHead {
  /** Смуга шапки: її гортає програма, слідом за тілом. */
  headRef: RefObject<HTMLDivElement | null>;
  /** Тіло: саме воно гортається вбік — пальцем і смугою скролу. */
  scrollRef: RefObject<HTMLDivElement | null>;
  /** Копія шапки — друга мірка тих самих стовпців. */
  copyRef: RefObject<HTMLTableElement | null>;
  /** Тіло — перша мірка. */
  bodyRef: RefObject<HTMLTableElement | null>;
  /** Спільні ширини стовпців у пікселях; порожньо — міри ще немає. */
  widths: number[];
  /** Тягне шапку за тілом. */
  onScroll: () => void;
}

/**
 * Ширини комірок першого рядка: у стовпці таблиці одна ширина на всіх, тож
 * перший рядок описує всю таблицю. `null` — міри немає (розкладки немає або
 * рядків немає).
 */
function rowWidths(table: HTMLTableElement | null, cells: string): number[] | null {
  const found = table?.querySelectorAll<HTMLElement>(cells);
  if (!found || found.length === 0) return null;

  const widths = Array.from(found, (cell) => Math.round(cell.getBoundingClientRect().width));

  // Нуль у кожній комірці — це «розкладки немає», а не нульова ширина: така
  // міра не міра, і публікувати її означало б скласти таблицю в нуль.
  return widths.some((width) => width > 0) ? widths : null;
}

/** Більша з двох мір — по стовпцях. Різна довжина буває лише в порожнього тіла. */
function widest(head: number[] | null, body: number[] | null): number[] {
  if (!head) return body ?? [];
  if (!body) return head;
  if (head.length !== body.length) return head.length > body.length ? head : body;
  return head.map((width, index) => Math.max(width, body[index]));
}

/** Рівність мір: без неї кожен рендер оновлював би стан — і рендерив би вічно. */
function same(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((width, index) => width === b[index]);
}

export function usePinnedHead(): PinnedHead {
  const headRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLTableElement>(null);
  const bodyRef = useRef<HTMLTableElement>(null);
  const [widths, setWidths] = useState<number[]>([]);

  const onScroll = useCallback(() => {
    const scroll = scrollRef.current;
    const head = headRef.current;
    if (scroll && head) head.scrollLeft = scroll.scrollLeft;
  }, []);

  // Міра знімається після кожного рендера: розкритий рядок, новий стовпець і
  // шрифт людини змінюють розкладку стовпців, а спільної події в них немає.
  // Зайвих рендерів це не додає — однакова міра не оновлює стан.
  useLayoutEffect(() => {
    const next = widest(
      rowWidths(copyRef.current, "thead tr:first-child > th"),
      rowWidths(bodyRef.current, "tbody tr:first-child > td"),
    );
    setWidths((prev) => (same(prev, next) ? prev : next));
    // Смуга шапки гортається програмою, і після переміру її зсув збитий:
    // повертаємо його на місце тіла.
    onScroll();
  });

  // Поворот екрана міняє ширину рамки, а зафіксовані стовпці за нею не йдуть.
  // Порожні ширини повертають таблицям розкладку за вмістом — і наступний
  // рендер міряє її наново (обидва — до фарбування).
  useLayoutEffect(() => {
    const forget = () => setWidths([]);
    window.addEventListener("resize", forget);
    return () => window.removeEventListener("resize", forget);
  }, []);

  return { headRef, scrollRef, copyRef, bodyRef, widths, onScroll };
}
