/**
 * Наскрізний стандарт таблиць: закріплені рядок 1 і стовпець 1
 * (`docs/DESIGN_SYSTEM.md` §27).
 *
 * Правило живе на **елементі** (`table td:first-child`), а не на класі — саме
 * тому його легко «оптимізувати» назад у приватну копію однієї таблиці. Тут
 * воно стережеться як текст: розбору CSS у тестовому середовищі немає.
 *
 * @module packages/shared/src/styles/tables.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./components.css", import.meta.url), "utf8");

/** Тіло правила від першої `{` після селектора до першої `}`. */
function rule(selector: string): string {
  const start = css.indexOf(selector);
  expect(start, `правило ${selector} має існувати`).toBeGreaterThan(-1);
  const open = css.indexOf("{", start + selector.length - 1);
  const close = css.indexOf("}", open);
  return css.slice(open, close);
}

describe("рядок 1 і стовпець 1 закріплені у кожній таблиці", () => {
  it("шапка липне до верху", () => {
    const head = rule(":where(table thead th)");
    expect(head).toContain("position: sticky");
    expect(head).toContain("top: 0");
  });

  it("перший стовпець липне до лівого краю", () => {
    const column = rule(":where(table th:first-child, table td:first-child)");
    expect(column).toContain("position: sticky");
    expect(column).toContain("left: 0");
  });

  it("перетин шапки й першого стовпця лежить вище за обидва", () => {
    expect(rule(":where(table thead th:first-child)")).toContain("z-index: 3");
  });

  it("закріплена комірка `wb-table` непрозора — інакше видно те, що проїжджає", () => {
    // Поверхня `wb-table` прозора (її несе сторінка), тож закріпленому
    // першому стовпцю тло треба задати окремо.
    expect(rule(":where(.wb-table td:first-child)")).toContain("background: var(--bg-page");
    expect(rule(":where(.wb-table tbody tr:nth-child(even) td:first-child)")).toContain(
      "background: var(--bg-2)",
    );
  });

  it("шаблон таблиці даних: тло тільки в шапки й першого стовпця", () => {
    expect(rule(".wb-table--grid th")).toContain("background: var(--wb-table-head)");
    expect(rule(".wb-table--grid td")).toContain("background: transparent");
    expect(rule(".wb-table--grid td:first-child")).toContain("background: var(--wb-table-pin)");
    expect(rule(".wb-table--grid thead th:first-child")).toContain(
      "background: var(--wb-table-head)",
    );
  });

  it("дані в комірках переносяться, а не обрізаються крапками", () => {
    const cell = rule(".wb-table--grid td");
    expect(cell).toContain("overflow-wrap: break-word");
    expect(cell).not.toContain("text-overflow");
    expect(rule(".wb-table--grid .wb-cell-title")).not.toContain("text-overflow");
  });

  it("скрол живе на сторінці, а не в рамці таблиці", () => {
    // Рамка таблиці, що сама скролить, лишає `sticky` без скролпорту — шапка
    // їхала разом із вмістом, і «закріпленість» була лише на словах.
    const box = rule(".wb-table-scroll");
    expect(box).not.toContain("overflow: auto");
    expect(box).not.toContain("max-height");
    expect(rule(".wb-table--grid th")).toContain("top: calc(-1 * var(--spend-pad");
  });

  it("на телефоні рядок лишає підпис, а числа переходять у пари `dt`/`dd`", () => {
    expect(css).toContain(".wb-table--stack tbody td:nth-child(n + 2)");
    expect(css).toContain("grid-template-columns: auto minmax(0, 1fr)");
    expect(rule(".wb-table-meta")).toContain("display: none");
  });

  it("стандарт — значення за замовчуванням, а не диктат над розкладкою таблиці", () => {
    // `:where()` дає нульову специфічність: таблиця, у якої комірка має власну
    // розкладку, перекриває стандарт простим правилом. Без цього він забирав
    // `position` у чекбокса картки дат (`dates.css`): абсолютна комірка
    // виходила в потік, і кожна картка ставала вдвічі вищою.
    for (const selector of [
      "table thead th",
      "table th:first-child, table td:first-child",
      "table thead th:first-child",
      ".wb-table td:first-child",
    ]) {
      expect(css, selector).toContain(`:where(${selector})`);
    }
  });
});
