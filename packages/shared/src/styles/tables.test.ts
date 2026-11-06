/**
 * Наскрізний стандарт таблиць (`docs/DESIGN_SYSTEM.md` §27): одна таблиця на
 * весь продукт — гортається сторінка, рамка скролить лише вбік, шапка й перший
 * стовпець закріплені та залиті, комірки даних без заливки.
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
function rule(selector: string, from = 0): string {
  const start = css.indexOf(selector, from);
  expect(start, `правило ${selector} має існувати`).toBeGreaterThan(-1);
  const open = css.indexOf("{", start + selector.length - 1);
  const close = css.indexOf("}", open);
  return css.slice(open, close);
}

describe("одна таблиця на весь продукт", () => {
  it("під таблицею немає підкладки, і вона не гортає себе", () => {
    const box = rule(".wb-table-scroll");
    /* Будь-який `overflow`, крім `visible`, робить із рамки скролпорт: шапка
       липне до неї, тобто їде разом зі сторінкою. Саме так вона й зникала на
       телефоні — і в адмінці, і в таблицях сторінок платформи. */
    expect(box).toContain("overflow: visible");
    expect(box).not.toContain("overflow-y");
    expect(box).not.toContain("max-height");
    /* Ні рамки, ні тла, ні тіні: таблиця лежить просто на тлі сторінки чи вікна. */
    expect(box).toContain("background: transparent");
    expect(box).toContain("border: 0");
    expect(box).toContain("border-radius: 0");
  });

  it("підстраховка вмикає прокрутку всередині рамки, якщо `sticky` не тримається", () => {
    expect(rule(".wb-table-scroll.wb-table-scroll--fallback")).toContain("overflow-y: auto");
    expect(rule(".wb-table-scroll.wb-table-scroll--fallback")).toContain("max-height: 70dvh");
  });

  it("обмежена висота — окремий випадок, а не типова поведінка", () => {
    const capped = rule(".wb-table-scroll--capped");
    expect(capped).toContain("overflow-y: auto");
    expect(css).not.toContain("--wb-table-max");
  });

  it("повзунок товстий: тонкий на телефоні не вхопити пальцем", () => {
    expect(rule(".wb-table-scroll::-webkit-scrollbar")).toContain("height: 12px");
    expect(css).toContain("scrollbar-width: auto");
  });

  it("шапка липне рівно до верху, без зсувів", () => {
    const head = rule(".wb-table th");
    expect(head).toContain("position: sticky");
    /* Від'ємний зсув ховав шапку під верхньою панеллю — виглядало як відсутня. */
    expect(head).toContain("top: 0");
    expect(css).not.toContain("--wb-table-stick-top");
  });

  it("між колонками є вертикальні лінії — інакше числа зливаються", () => {
    const grid = rule(".wb-table th + th,");
    expect(grid).toContain("border-left: 1px solid var(--border-subtle)");
    expect(css).toMatch(/\.wb-param-table td \+ td \{[^}]*border-left/);
    /* Перший стовпець лінію малює сам: його межа мусить їхати разом із ним. */
    expect(rule(".wb-table th:first-child,")).toContain("inset -1px 0 0 var(--border)");
  });

  it("рядок 1 і стовпець 1 залиті — це видно з першого погляду", () => {
    expect(rule(".wb-table-scroll")).toContain("--wb-table-head-bg:");
    expect(rule(".wb-table-scroll")).toContain("--wb-table-lead-bg:");
    expect(rule(".wb-table th")).toContain("background: var(--wb-table-head-bg)");
    expect(rule(".wb-table th:first-child,")).toContain("background: var(--wb-table-lead-bg)");
    expect(rule(".wb-table thead th:first-child")).toContain("background: var(--wb-table-head-bg)");
  });

  it("перший стовпець липне до лівого краю", () => {
    const first = rule(".wb-table th:first-child,");
    expect(first).toContain("position: sticky");
    expect(first).toContain("left: 0");
  });

  it("перетин шапки й першого стовпця лежить вище за обидва", () => {
    expect(rule(".wb-table thead th:first-child")).toContain("z-index: 4");
  });

  it("шапка по центру, числа в даних — праворуч, текст — ліворуч", () => {
    expect(rule(".wb-table th")).toContain("text-align: center");
    expect(rule(".wb-table td")).toContain("text-align: left");
    /* Праворуч — лише дані: підпис числової колонки теж по центру. */
    expect(css).toMatch(/\.wb-table td\.wb-col-num \{[^}]*text-align: right/);
    expect(css).not.toMatch(/\.wb-table \.wb-col-num \{[^}]*text-align: right/);
  });

  it("під таблицею немає картки — ні на моніторингу, ні у витратах", () => {
    /* Таблиця лежить на тлі екрана: картка навколо читається підкладкою, якої
       під таблицею бути не має. */
    for (const [file, selector] of [
      ["./admin/monitoring.css", ".mon-panel {"],
      ["./admin/spending.css", ".spend-panel {"],
    ] as const) {
      const source = readFileSync(new URL(file, import.meta.url), "utf8");
      const start = source.indexOf(selector);
      expect(start, `${selector} має існувати`).toBeGreaterThan(-1);
      const body = source.slice(start, source.indexOf("}", start));
      expect(body).toContain("background: transparent");
      expect(body).toContain("box-shadow: none");
    }
  });

  it("шапка залита акцентом теми, а не сірим", () => {
    const box = rule(".wb-table-scroll");
    expect(box).toContain("--wb-table-head-bg: color-mix(in srgb, var(--accent)");
    expect(box).toContain("--wb-table-lead-bg: color-mix(in srgb, var(--accent)");
  });

  it("у комірок даних немає заливки — рядок тримає межа", () => {
    const cell = rule(".wb-table td");
    expect(cell).toContain("background: transparent");
    expect(cell).toContain("border-bottom");
    expect(css).not.toContain("nth-child(even) td {\n  background");
  });

  it("на телефоні таблицю не роздуває до ширини десктопа", () => {
    const phone = css.slice(css.indexOf("@media (max-width: 640px)"));
    expect(phone).toContain("min-width: 0");
    expect(phone).toContain("overflow-wrap: anywhere");
    expect(phone).toContain(".wb-table .wb-col-num");
  });

  it("дані переносяться, а не обрізаються крапками", () => {
    expect(rule(".wb-table td")).toContain("overflow-wrap: break-word");
    expect(css).not.toContain(
      "text-overflow: ellipsis;\n  white-space: nowrap;\n  overflow: hidden;\n  max-width",
    );
    expect(css).not.toContain("wb-table--stack");
  });

  it("скролер сторінки — той, що над таблицею, і без обрізання", () => {
    /* Панель із `overflow: hidden` стає скролпортом для `sticky`: шапка липне
       до неї, а не до екрана, і їде разом зі сторінкою. */
    const chrome = readFileSync(new URL("./app-chrome.css", import.meta.url), "utf8");
    const body = chrome.slice(chrome.indexOf(".wb-page-body {"));
    const bodyRule = body.slice(0, body.indexOf("}"));
    expect(bodyRule).toContain("overflow-y: auto");
    const monitoring = readFileSync(new URL("./admin/monitoring.css", import.meta.url), "utf8");
    const panel = monitoring.slice(monitoring.indexOf(".mon-panel {"));
    const panelRule = panel.slice(0, panel.indexOf("}"));
    expect(panelRule).toContain("overflow: visible");
  });

  it("стандарт діє й на таблиці поза компонентом — нульовою специфічністю", () => {
    expect(rule(":where(table thead th)")).toContain("position: sticky");
    expect(rule(":where(table th:first-child, table td:first-child)")).toContain("left: 0");
    expect(rule(":where(table thead th:first-child)")).toContain("z-index: 3");
  });
});
