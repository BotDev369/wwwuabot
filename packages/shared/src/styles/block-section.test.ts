/**
 * Картка-акордеон блока сторінки (`.wb-block-section`).
 *
 * Власник 09.10.2026: «візуально треба бачити де який блок». Структуру тримає
 * поверхня з тінню, а не лінія (правило 15), і вона мусить лишитися прозорою
 * для липких шапок усередині.
 * @module packages/shared/src/styles/block-section.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./components.css", import.meta.url), "utf8");

function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, `правило ${selector} має існувати`).toBeGreaterThan(-1);
  const open = css.indexOf("{", start);
  const close = css.indexOf("\n}", open);
  return css.slice(open, close);
}

describe("блок сторінки як картка", () => {
  it("тримає межі поверхнею і тінню, а не лінією", () => {
    const card = rule(".wb-block-section");
    expect(card).toContain("background: var(--bg-2)");
    expect(card).toContain("box-shadow: var(--elevation-1)");
    expect(card).not.toContain("border:");
  });

  it("не стає контейнером скролу — інакше липка шапка таблиці тримається картки", () => {
    // Та сама пастка, що вже ловилась у рамці параметрів: `overflow` на
    // предкові зсуває липке до краю картки, а не екрана.
    expect(rule(".wb-block-section")).not.toContain("overflow");
  });

  it("дає вмісту свій берег, а підпису — тап-таргет пальця", () => {
    expect(rule(".wb-block-section__body")).toContain("padding");
    const toggle = rule(".wb-block-section__toggle");
    expect(toggle).toContain("min-height: 44px");
    expect(toggle).toContain("min-width: 0");
  });
});
