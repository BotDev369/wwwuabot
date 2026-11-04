/**
 * Сторож списку дат (`dates.css`): це та сама спільна таблиця, що й усюди —
 * рамка скролить, шапка й перший стовпець закріплені, без карток на телефоні.
 *
 * Читається як текст: розбору CSS у тестовому середовищі немає
 * (`environment: node`) — так само, як у `chrome.test.ts`.
 *
 * @module packages/shared/src/styles/dates.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./dates.css", import.meta.url), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Телефонна частина файлу — усе, що стоїть після маркера медіазапиту. */
const [wide, phone = ""] = css.split("@media (max-width: 520px)");

/** Тіло правила від першої `{` після селектора до першої `}`. */
function rule(scope: string, selector: string): string {
  const start = scope.indexOf(selector);
  expect(start, `правило ${selector} має існувати`).toBeGreaterThan(-1);
  const open = scope.indexOf("{", start + selector.length - 1);
  const close = scope.indexOf("}", open);
  return scope.slice(open, close);
}

describe("список дат — та сама таблиця, що й усюди", () => {
  it("на телефоні рядок лишається рядком, а не стає карткою", () => {
    // Картка ламала таблицю на всіх рівнях (`table`, `tbody`, `tr`, `td`).
    // Це був другий вигляд таблиці в продукті — рівно те, чого бути не має.
    for (const selector of [".wb-date-list", ".wb-date-row", ".wb-date-cell"]) {
      expect(phone, selector).not.toContain(`${selector} {\n  display: block`);
      expect(phone, selector).not.toContain("display: block;\n  width: 100%");
    }
  });

  it("шапку не ховають: закріплений рядок і є підписом стовпця", () => {
    expect(phone).not.toContain(".wb-date-head {\n  display: none");
    expect(phone).not.toContain("thead,");
  });

  it("мінімальна ширина задана — інакше шість колонок стискаються в кашу", () => {
    expect(rule(wide, ".wb-date-list .wb-date-table")).toContain("--wb-table-min: 760px");
  });

  it("рамка списку скролить обома осями через спільний клас", () => {
    // Скрол і закріплення дає `.wb-table-scroll` у `components.css`; власного
    // `overflow` файл дат не заводить, щоб не з'явився другий скролпорт.
    expect(css).not.toContain(".wb-date-list {\n  overflow-x: auto");
  });

  it("на телефоні лишаються лише правила сортування, модалки й вибірки", () => {
    for (const selector of [".wb-date-sort", ".wb-date-modal-footer", ".wb-date-bulk"]) {
      expect(phone, selector).toContain(selector);
    }
    // Тап-таргет 44px — не косметика (AGENTS.md §3).
    expect(rule(phone, ".wb-date-sort > select")).toContain("min-height: 44px");
    expect(rule(wide, ".wb-date-modal-footer > .wb-btn")).toContain("min-height: 44px");
  });
});
