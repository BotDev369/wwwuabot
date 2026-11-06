/**
 * HTML-таблиця з контенту стає тією самою таблицею продукту: рамка з
 * прокруткою в обидва боки, шапка й перший стовпець закріплені. Без рамки
 * широка таблиця розтягувала сторінку вбік, а шапка ховалась під смугою вікна.
 * @module packages/ui/src/blocks/wrap-tables
 */

/** Класи рамки й таблиці — ті самі, що дає `DataTable`. */
export const TABLE_FRAME_CLASS = "wb-table-scroll";
export const TABLE_CLASS = "wb-table";

/**
 * Обгортає кожну таблицю вмісту рамкою таблиці продукту.
 *
 * Контент приходить готовим HTML (`richtext`, `html`), тож єдине місце, де
 * його можна привести до спільного вигляду, — після вставки у DOM. Уже
 * обгорнуту таблицю не чіпаємо: повторний виклик не має давати другу рамку.
 */
export function wrapContentTables(root: HTMLElement | null): void {
  if (!root) return;

  for (const table of Array.from(root.querySelectorAll("table"))) {
    if (table.closest(`.${TABLE_FRAME_CLASS}`)) continue;
    table.classList.add(TABLE_CLASS);

    const frame = document.createElement("div");
    frame.className = TABLE_FRAME_CLASS;
    table.replaceWith(frame);
    frame.append(table);
  }
}
