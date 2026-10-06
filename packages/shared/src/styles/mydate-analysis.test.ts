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

  it("платформа зсуває закріплену шапку під хедер", () => {
    expect(rule(".wb-param-table th")).toContain("position: sticky");
    expect(rule(".wb-tabbar-layout .wb-param-table th")).toContain(
      "top: calc(var(--topbar-h) + var(--safe-top))",
    );
  });

  it("таблиця співставлення вміщається в ширину екрана", () => {
    // Ширша за екран таблиця вимагала б скролу навколо шапки — і шапка знову
    // була б заручником чужого краю.
    expect(rule(".wb-param-table--compare")).toContain("table-layout: fixed");
  });
});
