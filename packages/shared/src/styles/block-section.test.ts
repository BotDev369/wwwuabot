/**
 * Акордеон блока сторінки (`.wb-block-section`).
 * Власник 09.10.2026: «зайвий фон під акордеонами краде місце на екрані» —
 * тож поверхні в блока немає, а межі між блоками тримає просвіт зони
 * (`page-layout.test.ts`). `overflow` перевіряється окремо: на предкові він
 * робить контейнер скролу, і липка шапка таблиці тримається блока, а не екрана.
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

describe("блок сторінки як акордеон", () => {
  it("не малює власної поверхні: тло й тінь з'їдали висоту екрана", () => {
    const card = rule(".wb-block-section");
    expect(card).not.toContain("background");
    expect(card).not.toContain("box-shadow");
    expect(card).not.toContain("border");
  });

  it("не стає контейнером скролу — інакше липка шапка таблиці тримається блока", () => {
    expect(rule(".wb-block-section")).not.toContain("overflow");
  });

  it("дає підпису тап-таргет пальця на всю ширину й без берегів", () => {
    // Береги в підписі були потрібні картці; без неї вони лише зсували назву
    // блока від краю сторінки, де стоїть заголовок hero.
    expect(rule(".wb-block-section__head")).toContain("padding: 0");
    const toggle = rule(".wb-block-section__toggle");
    expect(toggle).toContain("min-height: 44px");
    expect(toggle).toContain("min-width: 0");
  });

  it("не тримає берегів навколо вмісту — кирпичики всередині мають свої", () => {
    expect(rule(".wb-block-section__body")).toContain("padding: 0");
  });
});
