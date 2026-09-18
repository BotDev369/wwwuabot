/**
 * Сторож меню: **плитки — по дві в ряду, і низ — зона пальця**.
 *
 * Чому це тест, а не коментар. Обидві речі ламаються мовчки: `grid` без
 * `repeat(2, …)` стає одним стовпчиком (меню знову смуги на всю ширину), а
 * притискання до низу, переписане на `justify-content: flex-end`, у тіла з
 * `overflow-y: auto` обрізає початок вмісту, коли той вищий за екран — і пункт,
 * який зник, ніхто не побачить, бо зник він угорі.
 *
 * Розбору CSS у тестовому середовищі немає (environment: node, без DOM), тож
 * CSS читається як текст — так само зроблено в `buttons.test.ts` і
 * `fields.test.ts`.
 *
 * @module packages/shared/src/styles/menu.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const CSS = readFileSync(
  join(REPO_ROOT, "packages/shared/src/styles/components.css"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

interface Rule {
  selector: string;
  body: string;
}

const RULES: Rule[] = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
  selector: selector.replace(/\s+/g, " ").trim(),
  body,
}));

/** Останнє правило для селектора — те, що справді діє при рівній специфічності. */
function rule(selector: string): Rule | undefined {
  return RULES.filter((entry) => entry.selector === selector).at(-1);
}

describe("меню: плитки й притискання до низу", () => {
  it("плитки — рівно дві в ряду", () => {
    const blocks = rule(".wb-menu-blocks");
    expect(blocks, "правило .wb-menu-blocks мусить існувати").toBeDefined();
    expect(blocks?.body).toContain("display: grid");
    // `minmax(0, 1fr)`, а не `1fr`: довгий підпис інакше розпирав би колонку й
    // вилазив за екран замість того, щоб перенестись.
    expect(blocks?.body).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
  });

  it("плитка — кнопка: тло, радіус і висота не менша за палець", () => {
    const block = rule(".wb-menu-block");
    expect(block, "правило .wb-menu-block мусить існувати").toBeDefined();
    expect(block?.body).toContain("background: var(--field-bg)");
    expect(block?.body).toContain("border-radius: var(--radius-md)");
    const minHeight = Number(block?.body.match(/min-height:\s*(\d+)px/)?.[1]);
    expect(minHeight).toBeGreaterThanOrEqual(44);
  });

  it("пояснення заглушки в плитці підрізається двома рядками", () => {
    // Довше пояснення робило б плитки різної висоти — сітка ламалася б об текст.
    const hint = rule(".wb-menu-block-hint");
    expect(hint?.body).toContain("-webkit-line-clamp: 2");
    expect(hint?.body).toContain("overflow: hidden");
  });

  it("вміст притискається до низу через `margin-top: auto`, а не флексом", () => {
    // `justify-content: flex-end` у скролованого тіла обрізає початок вмісту:
    // те, що не влізло, стає недосяжним. `margin-top: auto` тисне лише тоді,
    // коли місце справді є.
    const body = rule(".wb-menu-body--end > :first-child");
    expect(body, "правило притискання мусить існувати").toBeDefined();
    expect(body?.body).toContain("margin-top: auto");
    for (const entry of RULES) {
      if (!entry.selector.includes("wb-menu-body--end")) continue;
      expect(entry.body, entry.selector).not.toContain("justify-content");
    }
  });
});
