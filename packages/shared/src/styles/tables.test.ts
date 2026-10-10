/**
 * Наскрізний стандарт таблиць: закріплені рядок 1 і стовпець 1
 * (`docs/DESIGN_SYSTEM.md` §27).
 *
 * Правило живе на **елементі** (`table th:first-child`), а не на класі — саме
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
    const head = rule("table thead th");
    expect(head).toContain("position: sticky");
    expect(head).toContain("top: 0");
  });

  it("перший стовпець липне до лівого краю", () => {
    const column = rule("table th:first-child,\ntable td:first-child");
    expect(column).toContain("position: sticky");
    expect(column).toContain("left: 0");
  });

  it("перетин шапки й першого стовпця лежить вище за обидва", () => {
    expect(rule("table thead th:first-child")).toContain("z-index: 3");
  });

  it("закріплена комірка `wb-table` непрозора — інакше видно те, що проїжджає", () => {
    // Поверхня `wb-table` прозора (її несе сторінка), тож закріпленому
    // першому стовпцю тло треба задати окремо.
    expect(rule(".wb-table td:first-child")).toContain("background: var(--bg-page");
    expect(rule(".wb-table tbody tr:nth-child(even) td:first-child")).toContain(
      "background: var(--bg-2)",
    );
  });
});
