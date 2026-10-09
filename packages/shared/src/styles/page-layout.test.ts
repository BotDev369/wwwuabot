/**
 * Проміжок між блоками сторінки — власність зони, а не блока.
 *
 * Власник 09.10.2026: «скрізь проблема з відступами у всіх блоків». `gap`
 * стояв на `.page-zone--main`, а блоки лежать на рівень глибше — тому просвіт
 * між сусідніми давав кожен блок собі: hero 32px, таблиця дат нуль.
 * @module packages/shared/src/styles/page-layout.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const layout = readFileSync(new URL("./page-layout.css", import.meta.url), "utf8");
const components = readFileSync(new URL("./components.css", import.meta.url), "utf8");

/** Правило для селектора — разом із вкладеними блоками, як їх бачить CSSOM. */
function rule(css: string, selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, `правило ${selector} має існувати`).toBeGreaterThan(-1);
  const open = css.indexOf("{", start);
  const close = css.indexOf("\n}", open);
  return css.slice(open, close);
}

describe("проміжок між блоками сторінки", () => {
  it("належить обгортці блоків зони, а не самому блоку", () => {
    const blocks = rule(layout, ".page-zone-blocks");
    expect(blocks).toContain("display: flex");
    expect(blocks).toContain("flex-direction: column");
    expect(blocks).toContain("gap: var(--sp-4)");
  });

  it("зона не тримає другого такого самого проміжку", () => {
    // Два джерела того самого числа — це і є «відступи різні»: досить одному
    // відстати, щоб сторінка поїхала.
    const main = rule(layout, ".page-zone--main");
    expect(main).toContain("gap: var(--sp-4)");
  });
});

describe("hero-блок", () => {
  it("не додає власного відступу по краях — його дає зона", () => {
    // Регресія, яку видно на скриншоті: `padding: var(--sp-8) var(--sp-4)`
    // зсував текст hero на 16px усередину відносно заголовків сусідніх блоків
    // і додавав 32px порожнечі після підзаголовка.
    expect(rule(components, ".wb-block-hero")).not.toContain("padding");
  });

  it("утримує внутрішній відступ лише там, де під текстом лежить фото", () => {
    expect(rule(components, ".wb-block-hero--media")).toContain("padding:");
  });

  it("має всі три вирівнювання-стани, які рендерить розмітка", () => {
    for (const align of ["left", "center", "right"]) {
      expect(rule(components, `.wb-block-hero--${align}`), align).toContain("text-align");
    }
  });

  it("кнопки hero тримаються одного берега із заголовком", () => {
    expect(rule(components, ".wb-block-hero--center .wb-block-hero__actions")).toContain(
      "justify-content: center",
    );
    expect(rule(components, ".wb-block-hero--right .wb-block-hero__actions")).toContain(
      "justify-content: flex-end",
    );
  });
});
