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
 * Ширина вмісту, який не переноситься: текст плюс береги й межі.
 * `scrollWidth` не годиться — він дорівнює наявній ширині комірки, тож міра
 * залежала б від попередньої міри. Комірки, що переносяться, міру не дають.
 * Деталі — `DESIGN_SYSTEM` §27.
 */
function contentWidth(cell: HTMLElement): number | null {
  const style = getComputedStyle(cell);
  if (style.whiteSpace !== "nowrap") return null;
  const range = document.createRange();
  range.selectNodeContents(cell);
  const ink = range.getBoundingClientRect().width;
  if (!ink) return null;
  const pad = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
  const border =
    (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0);
  return Math.ceil(ink + pad + border);
}

/**
 * Ширини стовпців за найдовшим незмінним вмістом. `colspan`-комірки
 * пропускаємо: назва системи на всю ширину дала б одну міру на всю таблицю.
 * `null` — міри немає (розкладки немає або рядків немає).
 */
function rowWidths(table: HTMLTableElement | null, rows: string): number[] | null {
  const list = table ? [...table.querySelectorAll<HTMLTableRowElement>(rows)] : [];
  if (list.length === 0) return null;

  const widths: number[] = [];
  let measured = false;
  for (const row of list) {
    let index = 0;
    for (const cell of row.children) {
      const span = Math.max(1, (cell as HTMLTableCellElement).colSpan || 1);
      if (span === 1) {
        const width = contentWidth(cell as HTMLElement);
        if (width) {
          widths[index] = Math.max(widths[index] ?? 0, width);
          measured = true;
        } else if (widths[index] === undefined) {
          widths[index] = 0;
        }
      }
      index += span;
    }
  }

  /* Масив мусить бути щільним: `map` по дірах дає `NaN`, а `NaN !== NaN` —
     і стан оновлювався б на кожному рендері (нескінченний цикл). Нуль тут
     означає «міри немає», а не нульову ширину. */
  return measured ? Array.from({ length: widths.length }, (_, i) => widths[i] ?? 0) : null;
}

/**
 * Найдовше слово в комірці — міра, яку перенос не зменшує. Підпис колонки
 * переноситься, тож ширини по всьому тексту не взяти, але одне слово, довше за
 * колонку, обрізалось би; його міряє невидимий зразок. `0` — слів немає.
 */
function longestWord(cell: HTMLElement | null): number {
  const text = (cell?.textContent ?? "").trim();
  if (!cell || !text) return 0;

  const probe = document.createElement("span");
  probe.style.cssText =
    "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:nowrap;pointer-events:none";
  let width = 0;
  try {
    cell.appendChild(probe);
    for (const part of text.split(/\s+/)) {
      probe.textContent = part;
      width = Math.max(width, probe.getBoundingClientRect().width);
    }
  } finally {
    probe.remove();
  }
  return Math.ceil(width);
}

/** Більша з двох мір — по стовпцях. Різна довжина буває лише в порожнього тіла. */
function widest(head: number[] | null, body: number[] | null): number[] {
  if (!head) return body ?? [];
  if (!body) return head;
  if (head.length !== body.length) return head.length > body.length ? head : body;
  return head.map((width, index) => Math.max(width, body[index] ?? 0));
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
      rowWidths(copyRef.current, "thead tr"),
      rowWidths(bodyRef.current, "tbody tr"),
    );
    /* Стовпець підписів не може бути вужчим за свій мінімум: підпис
       переноситься, тож по вмісту його не зміряти (шапка дала б ширину слова
       «Параметр», і підписи вилазили б у значення). Мінімум задає `CSS` —
       а під `table-layout: fixed` `min-width` комірки не діє, тому передаємо
       його колонці явно. */
    if (next.length) {
      const cell = bodyRef.current?.querySelector<HTMLElement>("tbody tr > *:first-child");
      const min = cell ? Math.round(parseFloat(getComputedStyle(cell).minWidth) || 0) : 0;
      if (min > 0) next[0] = Math.max(next[0] ?? 0, min);
      /* Підпис, який не має де перенестись, ширину задає сам: слово довже за
         `min-width` під `table-layout: fixed` обрізалось краєм комірки — текст
         видно половинкою, а колонку вже не розтягнути. Міряємо найдовше слово
         в колонці й беремо його разом із берегами. */
      if (cell) {
        const style = getComputedStyle(cell);
        const pad = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
        let word = 0;
        for (const row of bodyRef.current?.querySelectorAll("tbody tr") ?? []) {
          word = Math.max(word, longestWord(row.querySelector<HTMLElement>(":scope > *")));
        }
        if (word > 0) next[0] = Math.max(next[0] ?? 0, Math.ceil(word + pad));
      }
    }
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
