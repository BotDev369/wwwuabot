/**
 * Сторож `date-analysis.css`: таблиця вітрини систем і рядки портрета.
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

describe("вітрина систем: таблиця без рамки й без власного скролу", () => {
  it("дані лежать на сторінці, а не в рамці зі своїм скролом", () => {
    const frame = rule(".wb-param-frame");
    expect(frame).not.toContain("overflow");
    expect(frame).not.toContain("height");
    expect(frame).not.toContain("border:");
    expect(frame).not.toContain("box-shadow");
    expect(frame).toContain("--wb-table-surface:");
  });

  it("рядок списку вищий за голий тап-таргет", () => {
    const toggle = rule(".wb-param-toggle");
    expect(toggle).toContain("min-height: 48px");
  });

  it("розкрита система підсвічена, а дотик сильніший за підсвітку", () => {
    expect(rule(".wb-param-group > td .wb-param-toggle--open")).toContain(
      "background: var(--accent-soft)",
    );
    expect(rule(".wb-param-table .wb-param-toggle:active")).toContain(
      "background: var(--surface-active)",
    );
  });

  it("пояснення — не рядок: тла й закріплення в нього немає", () => {
    expect(rule(".wb-param-detail td")).toContain("background: transparent");
    expect(
      rule(
        ".wb-param-table .wb-param-detail > td:first-child,\n.wb-param-table .wb-system-body > td:first-child",
      ),
    ).toContain("position: static");
  });

  it("текст списку — крок базового", () => {
    expect(rule(".wb-param-table")).toContain("font-size: var(--text-base)");
  });
});

describe("портрет: рядок якості й розрахунок", () => {
  it("старої таблиці аналізу й закріпленої шапки більше немає", () => {
    expect(css).not.toContain(".wb-analysis-views");
    expect(css).not.toContain(".wb-param-pin");
    expect(css).not.toContain("--param-views-h");
  });

  it("рядок якості — тап-таргет, а не текст без відгуку", () => {
    const summary = rule(".wb-dossier-quality__summary");
    expect(summary).toContain("min-height: 48px");
    expect(summary).toContain("cursor: pointer");
    expect(summary).toContain("list-style: none");
  });

  it("лічильників рівнів більше немає: жодних п'яти цифр під свідченням", () => {
    expect(css).not.toContain(".wb-dossier-distribution");
  });

  it("якість без свідчень лишається видимим рядком, а не зникає", () => {
    expect(rule(".wb-dossier-quality--empty")).toContain("min-height: 40px");
  });

  it("опитування — окремий стан на екрані", () => {
    expect(rule(".wb-dossier-survey")).toContain("border-radius: var(--radius-lg)");
    expect(rule(".wb-dossier-survey__link")).toContain("min-height: 44px");
  });

  it("вузький екран не розсовує портрет", () => {
    expect(rule(".wb-dossier")).toContain("min-width: 0");
    expect(rule(".wb-dossier__title")).toContain("overflow-wrap: anywhere");
  });
});
