/**
 * Сторож телефонної версії `spending.css`: таблиця мусить стати карткою, а не
 * виїхати колонками за екран (розбір CSS як тексту — `dates.test.ts`).
 *
 * @module packages/shared/src/styles/spending.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./admin/spending.css", import.meta.url), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Телефонна частина файлу — усе, що стоїть після маркера медіазапиту. */
const [wide, phone = ""] = css.split("@media (max-width: 768px)");

/** Тіло блоку від `{` до парної `}` — разом із вкладеними, як у CSSOM. */
function body(scope: string, open: number): string {
  let depth = 0;
  for (let i = open; i < scope.length; i++) {
    if (scope[i] === "{") depth++;
    else if (scope[i] === "}" && --depth === 0) return scope.slice(open, i);
  }
  throw new Error("блок не закритий");
}

/** Блок правила: пошук чіпляється за межу блоку, а не за рядок списку селекторів. */
function block(scope: string, match: (head: string) => boolean): string {
  const pattern = /(?:^|[{}])\s*([^{}\s][^{}]*?)\s*\{/g;
  const found = [...scope.matchAll(pattern)].find(([, head]) => match(head.trim()));
  expect(found, "блок мусить існувати").toBeDefined();
  return body(scope, scope.indexOf("{", found?.index));
}

/** Блок групового селектора: `selector` — один із пунктів списку. */
function group(scope: string, selector: string): string {
  return block(scope, (head) => head.split(",").some((part) => part.trim() === selector));
}

/** Правило з одним селектором — не зі списку, де той самий селектор лише пункт. */
function rule(scope: string, selector: string): string {
  return block(scope, (head) => head === selector);
}

describe("таблиця Є-data на телефоні", () => {
  it("ламається на всіх рівнях, а не лише на `tr`", () => {
    for (const selector of [".spend-table", ".spend-table tbody", ".spend-table tr"]) {
      expect(group(phone, selector), selector).toContain("display: block");
    }
    // Сама комірка — рядок картки: підпис ліворуч, значення праворуч.
    expect(rule(phone, ".spend-table td")).toContain("display: flex");
  });

  it("⛔ не тримає ширину таблиці: саме вона виносила колонки за екран", () => {
    expect(group(phone, ".spend-table")).toContain("min-width: 0");
    expect(phone).not.toContain("min-width: 560px");
  });

  it("підпис стовпця переїжджає в комірку через `data-label`", () => {
    expect(rule(phone, ".spend-table td::before")).toContain("content: attr(data-label)");
  });

  it("шапка таблиці на телефоні не малюється", () => {
    expect(rule(phone, ".spend-table thead")).toContain("display: none");
  });

  it("горизонтальний скрол контейнера вимкнений — вміст уміщується в ширину", () => {
    expect(rule(phone, ".spend-table-wrap")).toContain("overflow-x: visible");
  });

  it("на широкому екрані картка не вмикається", () => {
    expect(wide).not.toContain("attr(data-label)");
    expect(wide).not.toContain("overflow-x: visible");
  });
});
