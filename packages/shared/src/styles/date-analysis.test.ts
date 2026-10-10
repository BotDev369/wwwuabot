/**
 * Сторож закріпленої шапки таблиць «Дати» (`date-analysis.css`).
 *
 * Читається як текст: розбору CSS у тестовому середовищі немає
 * (`environment: node`) — так само, як у `dates.test.ts`.
 *
 * @module packages/shared/src/styles/date-analysis.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./date-analysis.css", import.meta.url), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Тіло блоку від `{` до парної `}` — разом із вкладеними. */
function body(open: number): string {
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(open, i);
  }
  throw new Error("блок не закритий");
}

/** Тіло правила: селектор мусить стояти на початку рядка — інакше знайдеться хвіст чужого. */
function rule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const found = new RegExp(`(?:^|\\n)${escaped} \\{`).exec(css);
  expect(found, `${selector}: правила немає`).not.toBeNull();
  return body(css.indexOf("{", found?.index ?? 0));
}

describe("шапка таблиці лишається на видноті", () => {
  it("рамка не скролить себе — інакше шапка тримається її краю, а не екрана", () => {
    // Закріплене тримається краю того, хто скролить. Поки скролила рамка,
    // шапка зникала під хедером разом із нею.
    const frame = rule(".wb-param-frame");
    expect(frame).not.toContain("overflow");
    expect(frame).not.toContain("max-height");
  });

  it("платформа зсуває закріплену шапку під хедер — із просвітом", () => {
    expect(rule(".wb-param-table th")).toContain("position: sticky");
    // Зсув — токен висоти хедера, а не його формула: поки число стояло тут
    // окремо, вищий хедер (назва у два рядки) ховав шапку під собою.
    expect(rule(".wb-tabbar-layout .wb-param-table th")).toContain(
      "top: calc(var(--appbar-h) + var(--sp-2))",
    );
  });

  it("просвіт закриває липка смуга тла екрана — інакше в ньому видно рядки", () => {
    const veil = rule(".wb-tabbar-layout .wb-param-frame:has(thead)::before");
    expect(veil).toContain("position: sticky");
    expect(veil).toContain("top: var(--appbar-h)");
    expect(veil).toContain("background: var(--bg-page");
    // Висота смуги — і просвіт, і від'ємний відступ: у спокої шапка стоїть там,
    // де стояла б без смуги.
    expect(veil).toContain("height: var(--sp-2)");
    expect(veil).toContain("margin-bottom: calc(-1 * var(--sp-2))");
  });

  it("смуга-просвіт стоїть лише в рамки з липкою шапкою", () => {
    // У вітрини систем шапки немає, а тло екрана в смузі лягало **поверх**
    // першого рядка (`z-index` вищий за статичну комірку) — виходила світла
    // лінія під підписом блока.
    expect(rule(".wb-tabbar-layout .wb-param-frame:has(thead)::before")).toContain(
      "background: var(--bg-page",
    );
    expect(css).not.toContain(".wb-tabbar-layout .wb-param-frame::before");
  });

  it("верхній кант рамки не читається розділювачем під підписом блока", () => {
    // Обвідка давала волосяну лінію просто під підписом — з тією ж товщиною,
    // що й розділювачі між рядками, тож підпис виглядав першим рядком.
    const frame = rule(".wb-param-frame");
    expect(frame).not.toContain("border:");
    expect(frame).not.toContain("border-top");
    expect(frame).toContain("box-shadow");
  });

  it("перший рядок не перемальовує заокруглений кут рамки", () => {
    // Прямокутне тло комірки лягало на кут рамки власним квадратом.
    expect(rule(".wb-param-table tbody tr:first-child > td")).not.toContain("background");
  });

  it("підакордеони параметрів не тримають вертикальної смуги", () => {
    // Вкладеність показує зсув: підпис параметра стоїть на крок глибше за
    // назву системи. Смуга була другою межею в списку, побудованому на берегах.
    expect(rule(".wb-system-params")).not.toContain("border-left");
  });

  it("текст списку — крок базового, а не дрібніший", () => {
    expect(rule(".wb-param-table")).toContain("font-size: var(--text-base)");
  });

  it("підпис над таблицею має просвіт — інакше читається як перша комірка", () => {
    expect(rule(".wb-block-date-analysis__title")).toContain("margin-bottom: var(--sp-4)");
  });

  it("кути шапки повторюють рамку — її більше не обрізає `overflow`", () => {
    // Прямокутник шапки з непрозорим тлом вилазив за заокруглені кути рамки.
    expect(rule(".wb-param-table thead th:first-child")).toContain("border-top-left-radius");
    expect(rule(".wb-param-table thead th:last-child")).toContain("border-top-right-radius");
  });

  it("таблиця аналізу вміщається в ширину екрана", () => {
    // Ширша за екран таблиця вимагала б скролу навколо шапки — і шапка знову
    // була б заручником чужого краю.
    expect(rule(".wb-param-table--compare")).toContain("table-layout: fixed");
  });
});

describe("три шари розкритої системи", () => {
  it("шапка, опис і параметри не мають спільного тла", () => {
    // Назва, опис і підакордеони лежали на одному тлі — система читалась одним
    // сірим полотном. Шапка — підсвітка акцентом, опис — тло рамки, параметри
    // — вкладена поверхня.
    expect(rule(".wb-param-group > td .wb-param-toggle--open")).toContain(
      "background: var(--accent-soft)",
    );
    expect(rule(".wb-system-params")).toContain("background: var(--bg-3)");
  });

  it("назва системи на крок більша за власні параметри", () => {
    // Підпис групи, а не ще один рядок списку.
    expect(rule(".wb-analysis-systems__name")).toContain("font-size: var(--text-md)");
  });

  it("шапка першої системи повторює заокруглення рамки", () => {
    // Підсвітка стоїть на кнопці — без заокруглення вона лягала б на верхній
    // кут рамки власним квадратом.
    const head = rule(".wb-param-table tbody tr:first-child > td > .wb-param-toggle--open");
    expect(head).toContain("border-top-left-radius: var(--radius-md)");
    expect(head).toContain("border-top-right-radius: var(--radius-md)");
  });

  it("дотик лишається сильнішим за підсвітку розкритого рядка", () => {
    // Інакше саме розкрита шапка не відповідала б на палець: підсвітка має
    // вищу специфічність, тож `:active` бере її — префіксом таблиці.
    expect(rule(".wb-param-table .wb-param-toggle:active")).toContain(
      "background: var(--surface-active)",
    );
  });
});
