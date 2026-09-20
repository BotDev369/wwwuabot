/**
 * Сторож картки профілю: **рядок поля — один рядок, а шапка акаунта — частина
 * картки, а не окремий блок поруч**.
 *
 * Чому це тест, а не коментар. Обидві речі вже були зламані мовчки й повернуться
 * так само: рядок, що на вузькому екрані стає стовпчиком (`flex-direction:
 * column`), виглядає «правильніше» у коді, а на телефоні розтягує картку з
 * шести полів на простирадло — і жоден тест на це не падає, бо CSS тут читається
 * як текст, а не як розмітка.
 *
 * Друге — шапка (`photo` + ім'я + `@юзернейм`) і поля мають лишатись **одним**
 * блоком: окрема картка з шапкою читалась як інший екран, і саме тому сторінка
 * виглядала розсипаною (`AGENTS.md` §3).
 *
 * Розбору CSS у тестовому середовищі немає (environment: node, без DOM), тож
 * CSS читається як текст — так само зроблено в `buttons.test.ts`,
 * `fields.test.ts` і `menu.test.ts`.
 *
 * @module packages/shared/src/styles/profile.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const CSS = readFileSync(
  join(REPO_ROOT, "packages/shared/src/styles/app-chrome.css"),
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

/** Усі правила, у селекторі яких є клас (зокрема всередині медіа-запитів). */
function rulesFor(cls: string): Rule[] {
  const pattern = new RegExp(`\\.${cls.replace(/^\./, "")}(?![\\w-])`);
  return RULES.filter((entry) => pattern.test(entry.selector));
}

describe("картка профілю: стислий рядок поля", () => {
  it("не переносить підпис і значення в стовпчик ні на якій ширині", () => {
    const rows = rulesFor(".wb-profile-field");

    expect(rows.length, "правило .wb-profile-field мусить існувати").toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.body, row.selector).not.toContain("flex-direction: column");
      expect(row.body, row.selector).not.toContain("align-items: flex-start");
    }
  });

  it("ставить підпис і значення в один рядок по краях", () => {
    const row = rule(".wb-profile-field");

    expect(row?.body).toContain("display: flex");
    expect(row?.body).toContain("justify-content: space-between");
    // Базова лінія: довге значення переноситься, а підпис лишається на його
    // першому рядку, а не «пливе» в середину абзацу.
    expect(row?.body).toContain("align-items: baseline");
  });

  it("тримає значення праворуч, лишаючи підпису місце", () => {
    const value = rule(".wb-profile-value");

    expect(value?.body).toContain("text-align: right");
    expect(value?.body).toContain("max-width");
  });
});

describe("картка профілю: шапка акаунта всередині блоку", () => {
  it("має власні правила для шапки — кирпичик, а не приватний клас оболонки", () => {
    expect(rule(".wb-account-head")?.body).toContain("display: flex");
    expect(rule(".wb-account-head-title")?.body).toContain("font-weight");
    expect(rule(".wb-account-head-note")?.body).toContain("color: var(--text-muted)");
  });

  it("не робить ім'я в шапці другим заголовком картки", () => {
    // Над шапкою стоїть `.wb-profile-title` (18–20px у брендових темах): ім'я
    // того самого розміру читалось би як другий рівень заголовка.
    expect(rule(".wb-account-head-title")?.body).toContain("font-size: var(--text-md)");
  });
});
