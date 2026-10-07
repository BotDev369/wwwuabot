/**
 * Сторож закріпленої шапки таблиць «Дати» (`mydate-analysis.css`).
 *
 * Читається як текст: розбору CSS у тестовому середовищі немає
 * (`environment: node`) — так само, як у `mydate-layout.test.ts`.
 *
 * @module packages/shared/src/styles/mydate-analysis.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./mydate-analysis.css", import.meta.url), "utf8").replace(
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
    const veil = rule(".wb-tabbar-layout .wb-param-frame::before");
    expect(veil).toContain("position: sticky");
    expect(veil).toContain("top: var(--appbar-h)");
    expect(veil).toContain("background: var(--bg-page");
    // Висота смуги — і просвіт, і від'ємний відступ: у спокої шапка стоїть там,
    // де стояла б без смуги.
    expect(veil).toContain("height: var(--sp-2)");
    expect(veil).toContain("margin-bottom: calc(-1 * var(--sp-2))");
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
