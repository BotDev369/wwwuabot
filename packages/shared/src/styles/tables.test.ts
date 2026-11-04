/**
 * Наскрізний стандарт таблиць (`docs/DESIGN_SYSTEM.md` §27): одна таблиця на
 * весь продукт — рамка скролить у обидва боки, шапка й перший стовпець
 * закріплені, у комірок немає заливки.
 *
 * Тест читає CSS як текст: розбору стилів у тестовому середовищі немає.
 * Вартовий потрібен тому, що «одну таблицю» найлегше зламати, завівши
 * приватну копію стилів для однієї сторінки.
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

describe("одна таблиця на весь продукт", () => {
  it("рамка скролить в обидва боки", () => {
    const box = rule(".wb-table-scroll");
    expect(box).toContain("overflow: auto");
    expect(box).toContain("max-height");
    expect(box).toContain("overscroll-behavior: contain");
    expect(box).toContain("touch-action: pan-x pan-y");
  });

  it("повзунок товстий: тонкий на телефоні не вхопити пальцем", () => {
    expect(rule(".wb-table-scroll::-webkit-scrollbar")).toContain("height: 12px");
    expect(css).toContain("scrollbar-width: auto");
  });

  it("шапка липне до верху рамки", () => {
    const head = rule(".wb-table th");
    expect(head).toContain("position: sticky");
    expect(head).toContain("top: 0");
  });

  it("перший стовпець липне до лівого краю", () => {
    const first = rule(".wb-table th:first-child,");
    expect(first).toContain("position: sticky");
    expect(first).toContain("left: 0");
  });

  it("перетин шапки й першого стовпця лежить вище за обидва", () => {
    expect(rule(".wb-table thead th:first-child")).toContain("z-index: 4");
  });

  it("у комірок немає заливки — рядок тримає межа", () => {
    const cell = rule(".wb-table td");
    expect(cell).toContain("background: transparent");
    expect(cell).toContain("border-bottom");
    expect(css).not.toContain("nth-child(even) td {\n  background");
  });

  it("закріплене непрозоре — інакше видно те, що проїжджає", () => {
    expect(rule(".wb-table-scroll")).toContain("--wb-table-surface: var(--card-bg)");
    expect(rule(".wb-table th:first-child,")).toContain("var(--wb-table-surface)");
  });

  it("дані переносяться, а не обрізаються крапками", () => {
    expect(rule(".wb-table td")).toContain("overflow-wrap: break-word");
    expect(css).not.toContain(
      "text-overflow: ellipsis;\n  white-space: nowrap;\n  overflow: hidden;\n  max-width",
    );
    expect(css).not.toContain("wb-table--stack");
  });

  it("стандарт діє й на таблиці поза компонентом — нульовою специфічністю", () => {
    expect(rule(":where(table thead th)")).toContain("position: sticky");
    expect(rule(":where(table th:first-child, table td:first-child)")).toContain("left: 0");
    expect(rule(":where(table thead th:first-child)")).toContain("z-index: 3");
  });
});
