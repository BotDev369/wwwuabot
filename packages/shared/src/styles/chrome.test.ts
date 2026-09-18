/**
 * Сторож хрому футера: **«+» — кнопка, вибрана вкладка — ні**.
 *
 * Чому це тест. Слот дії у футері займає ту саму п'яту частину смуги, що й
 * вкладка, а підпису не має — і без кола знак висів у цій порожнечі, читаючись
 * «величезною» вкладкою (сам знак при цьому звичайні 24px). Коло виправляє саме
 * роль, і воно ламається тихо: втрачений `border-radius` дає квадрат, а
 * втрачене тло — знову нічим не обмежений знак.
 *
 * Друга половина — те, чого тут бути НЕ повинно: акцентного кола в **вибраного**
 * розділу. Це різні сенси (дія проти стану), тож одне не має переїхати в інше:
 * смуга, у якій світяться два круги, не каже нічого.
 *
 * CSS читається як текст — розбору CSS у тестовому середовищі немає
 * (`environment: node`), так само зроблено в `menu.test.ts` і `buttons.test.ts`.
 *
 * @module packages/shared/src/styles/chrome.test
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

describe("футер: слот дії", () => {
  it("«+» стоїть на акцентному колі — це кнопка, а не вкладка", () => {
    const circle = rule(".wb-tabbar-item--primary .wb-tabbar-icon");
    expect(circle, "правило знака слота дії мусить існувати").toBeDefined();
    expect(circle?.body).toContain("background: var(--accent)");
    expect(circle?.body).toContain("border-radius: var(--radius-full)");
    // Знак на залитому тлі мусить бути світлим — інакше акцент його з'їдає.
    expect(circle?.body).toContain("color: var(--text-inverse)");
    // Коло — планка пальця: менше за 40px воно перестає читатись як кнопка.
    const size = Number(circle?.body.match(/width:\s*(\d+)px/)?.[1]);
    expect(size).toBeGreaterThanOrEqual(40);
    expect(circle?.body).toContain(`height: ${size}px`);
  });

  it("у вибраного розділу кола немає — вибір показує сам знак", () => {
    // Активна вкладка відрізняється залитим близнюком іконки (`iconActive`) та
    // кольором підпису. Акцентне коло там означало б «дію», а не «тут ти».
    expect(rule(".wb-tabbar-item--active .wb-tabbar-icon")).toBeUndefined();
    // І жодне з правил активної вкладки (там уже є штрих знака) не малює кола.
    for (const entry of RULES) {
      if (!entry.selector.includes("--active") || !entry.selector.includes("wb-tabbar-icon"))
        continue;
      expect(entry.body, entry.selector).not.toContain("background");
      expect(entry.body, entry.selector).not.toContain("border-radius");
    }
  });

  it("смуга не росте від кола: мірки задає токен, а не вміст", () => {
    // Висота смуги — `--tab-bar-h` (бренд + safe-area). Коло 40px у неї влізе
    // лише тому, що воно не більше за планку HIG (56px) і Material (60px).
    const bar = rule(".wb-tabbar");
    expect(bar?.body).toContain("height: var(--tab-bar-h)");
    expect(rule(".wb-tabbar-inner")?.body).toContain("align-items: stretch");
  });
});
