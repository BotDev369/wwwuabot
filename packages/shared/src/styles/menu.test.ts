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

  it("іконка готового розділу — акцентна, заглушка лишається приглушеною", () => {
    // Це не оформлення, а різниця станів: у сітці однакових плиток око не
    // бачило, які з них уже працюють. Заглушка не отримує нічого — її стан
    // уже показано кирпичиком `.wb-badge` і приглушеним підписом.
    const accent = rule(".wb-menu-block:not(.wb-menu-block--soon) .wb-menu-block-icon");
    expect(accent, "правило акцентної іконки мусить існувати").toBeDefined();
    expect(accent?.body).toContain("color: var(--accent)");
    expect(rule(".wb-menu-block--soon .wb-menu-block-icon")).toBeUndefined();
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

  it("облікові картки — у дві колонки, і ділять вільний простір", () => {
    // Дві речі ламаються мовчки: `grid` без `repeat(2, …)` стає одним
    // стовпчиком (картка знову смуга, як пункт), а втрачений `flex: 1`
    // повертає порожнечу під заголовком — меню при цьому робоче, тож ніхто
    // й не помітить.
    const cards = rule(".wb-menu-account");
    expect(cards, "правило .wb-menu-account мусить існувати").toBeDefined();
    expect(cards?.body).toContain("display: grid");
    // `minmax(0, 1fr)`, а не `1fr`: довге ім'я інакше розпирає колонку й
    // вилазить за екран замість того, щоб перенестись.
    expect(cards?.body).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");

    const grow = rule(".wb-menu-body--end > .wb-menu-account");
    expect(grow, "рости картки мусять лише в притиснутому вмісті").toBeDefined();
    expect(grow?.body).toContain("flex: 1");
  });

  it("облікова картка — кнопка: тло, радіус і висота не менша за палець", () => {
    const card = rule(".wb-menu-account-card");
    expect(card, "правило .wb-menu-account-card мусить існувати").toBeDefined();
    expect(card?.body).toContain("background: var(--field-bg)");
    expect(card?.body).toContain("border-radius: var(--radius-md)");
    const minHeight = Number(card?.body.match(/min-height:\s*(\d+)px/)?.[1]);
    expect(minHeight).toBeGreaterThanOrEqual(44);
  });
});
