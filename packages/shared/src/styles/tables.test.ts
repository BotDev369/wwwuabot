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
  it("рамка сама гортає таблицю в обидва боки — як аркуш Excel", () => {
    const box = rule(".wb-table-scroll");
    /* Одна прокрутка на таблицю: рамка. Коли гортала сторінка, вбік їхав весь
       екран разом із хромом, а шапка липла до сторінки й ховалась під смугою
       вікна. Власна висота тримає шапку в рамці, власна ширина — в екрані. */
    expect(box).toContain("overflow: auto");
    expect(box).toContain("max-height:");
    expect(box).toContain("max-width: 100%");
    expect(box).toContain("overscroll-behavior: contain");
    /* Ні рамки, ні тла, ні тіні: таблиця лежить просто на тлі сторінки чи вікна. */
    expect(box).toContain("background: transparent");
    expect(box).toContain("border: 0");
    expect(box).toContain("border-radius: 0");
  });

  it("хром сторінки не підмінює прокрутку таблиці", () => {
    /* Підписи над таблицею лишались на місці хаком `sticky left: 0` — і саме
       він вилазив за екран. Гортає лише рамка таблиці. */
    expect(css).not.toContain(":not(:has(table))");
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

  it("рядок 1 і стовпець 1 залиті в обох родинах таблиць", () => {
    /* Одна каркасна вимога для адмінки й платформи: без спільного правила
       матриця аналізу лишалась із прозорим першим стовпцем, і значення
       просвічували крізь підписи. */
    const lead = rule(
      [
        ".wb-table th:first-child,",
        ".wb-table td:first-child,",
        ".wb-param-table th:first-child,",
        ".wb-param-table td:first-child",
      ].join("\n"),
    );
    expect(lead).toContain("position: sticky");
    /* Колір рахується в тому ж правилі: тон теми над поверхнею-носієм. */
    expect(lead).toMatch(/\(in srgb, var\(--data-1\) 12%/);
    expect(lead).toContain("background: var(--wb-table-lead-bg)");
    /* Запасна поверхня — щоб заливка не стала прозорою там, де поверхню не
       задано, інакше крізь неї видно текст сусідньої колонки. */
    expect(lead).toContain("var(--wb-table-surface, var(--bg-2))");
    /* Верхній лівий кут — шапка, а не стовпець: у нього тон рядка 1. */
    expect(rule(".wb-table thead th:first-child,")).toContain(
      "background: var(--wb-table-lead-bg)",
    );
  });

  it("перший стовпець липне до лівого краю на будь-якій ширині", () => {
    const first = rule(".wb-table th:first-child,");
    expect(first).toContain("position: sticky");
    expect(first).toContain("left: 0");
    /* Телефон не виняток: підпис рядка — орієнтир, без нього сума вїжджає
       в порожнечу, і людина не знає, чиї це гроші. */
    expect(css).not.toMatch(/th:first-child[^{]*\{[^}]*left: auto/);
    expect(css).not.toMatch(/td:first-child[^{]*\{[^}]*position: static/);
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

  it("шапка залита одним кольором теми, а не веселкою по колонках", () => {
    /* Рядок 1 озаглавлює таблицю цілком. Шість барв у ньому читались
       новорічною гірляндою замість заголовка, тож тон один — з палітри теми,
       не акцент (акцент означає дію, а не заголовок). */
    const head = rule(".wb-table th").replace(/\s+/g, " ");
    expect(head).toContain(
      "background: color-mix( in srgb, var(--wb-table-hue, var(--data-1)) 28%, var(--wb-table-surface, var(--bg-2)) )",
    );
    expect(head).not.toContain("--accent");
    /* Один тон на всю шапку: жодного перебору барв по колонках. */
    expect(rule(".wb-table thead tr,")).toContain("--wb-table-hue: var(--data-1)");
    expect(css).not.toMatch(/--wb-table-hue: var\(--data-[2-6]\)/);
    /* Поверхня-носій задає, на чому лежить таблиця: закріплені клітинки
       мусять збігатися з нею, інакше крізь них просвічує вміст. */
    expect(rule(".wb-table-scroll")).toContain("--wb-table-surface: var(--bg-2)");
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
