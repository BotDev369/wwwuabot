/**
 * Бот пише **лише** вхід у бота — і це перевіряється читанням джерела.
 *
 * Два факти, які легко зламати мовчки й дорого:
 *
 * 1. **Закріплення — один раз.** Умова `joined_bot_at IS NULL` мусить стояти в
 *    самому `UPDATE`: окрема перевірка «а вільний він?» губиться на наступному
 *    шляху, і двоє людей закріплюються за одним контактом навперебіч.
 * 2. **Дату платформи бот не ставить.** Він не бачить, чи натиснули кнопку
 *    «Відкрити сторінку», тож записана ним дата була б вигадкою — а її ж
 *    показує картка контакту.
 *
 * Середовища D1 у `bot-dev` немає (тестів репозиторіїв тут не ведуть), тож
 * перевіряємо саме запит: це єдина частина рішення, яка може розійтися з
 * правилом, і читання джерела тут чесніше за фейкову базу, яка нічого не
 * доводить про реальний SQL.
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "contact.repository.ts"),
  "utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

/** Тіло `attach` — саме той запит, який закріплює людину. */
function attachBody(): string {
  const start = SOURCE.indexOf("async attach(");
  expect(start).toBeGreaterThan(-1);
  return SOURCE.slice(start, SOURCE.indexOf("\n  }", start));
}

describe("закріплення контакту в боті", () => {
  it("пише id людини й дату входу в бота", () => {
    const body = attachBody();

    expect(body).toContain("joined_user_id = ?");
    expect(body).toContain("joined_bot_at = ?");
  });

  it("⛔ закріплює раз: умова «ще ніхто» стоїть у самому UPDATE", () => {
    expect(attachBody()).toMatch(/WHERE id = \? AND joined_bot_at IS NULL/);
  });

  it("⛔ дату платформи бот не ставить — він не бачить входу в Mini App", () => {
    expect(SOURCE).not.toContain("joined_platform_at");
  });

  it("хендл людини дописується лише тоді, коли його ще немає", () => {
    // Власник міг вписати хендл сам, і перехід не має права переписати те, що
    // людина написала про людину.
    expect(attachBody()).toContain("COALESCE(NULLIF(username, ''), ?)");
  });
});
