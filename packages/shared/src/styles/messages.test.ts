/**
 * Сторож стилів повідомлень: те, що ламається мовчки.
 *
 * Тут три речі, кожна з яких уже коштувала в цьому проєкті помилки на телефоні:
 *
 * 1. **Смуга вводу мусить розтягувати поле.** Спільна `.wb-sheet-bar` притискає
 *    контроли праворуч (вона несе перемикач і вихід), тож без перекриття поле
 *    вводу стискалось би до ширини свого тексту.
 * 2. **Кнопка надсилання — під палець.** Дія, менша за 44px, на телефоні
 *    промахується; саме тому вона коло фіксованого розміру, а не «за вмістом».
 * 3. **Своя бульбашка — акцентна, чужа — ні.** Сторона бульбашки єдине, що
 *    відрізняє своє від чужого на швидкому погляді, і зламати це можна одним
 *    кольором.
 *
 * CSS читається як текст: розбору CSS у тестовому середовищі немає
 * (`environment: node`), так само зроблено в `chrome.test.ts` і `menu.test.ts`.
 *
 * @module packages/shared/src/styles/messages.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

interface Rule {
  selector: string;
  body: string;
}

function rulesOf(file: string): Rule[] {
  const css = readFileSync(join(REPO_ROOT, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector, body]) => ({
    selector: selector.replace(/\s+/g, " ").trim(),
    body,
  }));
}

const MESSAGES = rulesOf("packages/shared/src/styles/messages.css");
const COMPONENTS = rulesOf("packages/shared/src/styles/components.css");

/** Останнє правило для селектора — те, що справді діє при рівній специфічності. */
function rule(rules: Rule[], selector: string): Rule | undefined {
  return rules.filter((entry) => entry.selector === selector).at(-1);
}

describe("смуга вводу", () => {
  it("перекриває притискання спільної смуги праворуч", () => {
    // Спільна смуга обслуговує перемикач і вихід — обидва вузькі. Поле вводу
    // мусить рости, тож саме тут стоїть перекриття.
    expect(rule(COMPONENTS, ".wb-sheet-bar")?.body).toContain("justify-content: flex-end");
    expect(rule(MESSAGES, ".wb-sheet-bar.wb-thread-bar")?.body).toContain(
      "justify-content: stretch",
    );
    expect(rule(MESSAGES, ".wb-thread-input")?.body).toContain("flex: 1");
  });

  it("кнопка надсилання — коло під палець, а не «за вмістом»", () => {
    const send = rule(MESSAGES, ".wb-thread-send");
    expect(send?.body).toContain("width: 44px");
    expect(send?.body).toContain("height: 44px");
    expect(send?.body).toContain("border-radius: var(--radius-full)");
    // Порожнє поле гасить дію, а не ховає її: на телефоні hover не існує (§3).
    expect(rule(MESSAGES, ".wb-thread-send:disabled")?.body).toContain("opacity");
  });
});

describe("бульбашки", () => {
  it("сторони різні, і свою видно акцентом", () => {
    const mine = rule(MESSAGES, ".wb-bubble--out");
    const theirs = rule(MESSAGES, ".wb-bubble--in");

    expect(mine?.body).toContain("background: var(--accent)");
    expect(mine?.body).toContain("align-self: flex-end");
    expect(theirs?.body).toContain("align-self: flex-start");
    expect(theirs?.body).not.toContain("var(--accent)");
  });

  it("чужий текст не вилазить за бульбашку", () => {
    // Адреса чи код без пробілів — звичайний вміст повідомлення, і він мусить
    // переноситись, а не розтягувати стрічку.
    expect(rule(MESSAGES, ".wb-bubble-text")?.body).toContain("overflow-wrap: anywhere");
    expect(rule(MESSAGES, ".wb-bubble")?.body).toContain("max-width");
  });
});
