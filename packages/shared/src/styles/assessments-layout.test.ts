/**
 * Сторож висоти екрана проходження: **контент має вміщуватись без гортання**.
 *
 * Чому це тест, а не коментар. Власник 29.09.2026 показав скриншот і сказав:
 * «все вміщалось на одному екрані, а то доводиться гортати». Причина була не в
 * довжині текстів, а в одному рядку: `.wb-run` мав `min-height: 100dvh` і лежав
 * усередині `.wb-app`, яка вже має `height: 100dvh` і `overflow: hidden`.
 * Тобто вміст був висотою в цілий екран **плюс** шапка над ним — шість
 * варіантів, питання й кнопка не могли вміститись ні на одному питанні.
 *
 * Правило: розмір екрана вмісту береться **від контейнера сторінки** (100%),
 * а не від екрана пристрою (`dvh`/`vh`). Інакше будь-яка рамка над вмістом —
 * шапка, футер — додає другий екран прокрутки.
 *
 * Розбору CSS у тестовому середовищі немає (environment: node, без DOM), тож
 * читається як текст — так само, як у `buttons.test.ts` і `fields.test.ts`.
 *
 * @module packages/shared/src/styles/assessments-layout.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./assessments.css", import.meta.url), "utf8");

/** Правило для селектора — разом із вкладеними блоками, як їх бачить CSSOM. */
function rule(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  expect(start, `правило ${selector} має існувати`).toBeGreaterThan(-1);
  const open = css.indexOf("{", start);
  const close = css.indexOf("\n}", open);
  return css.slice(open, close);
}

describe("екран проходження", () => {
  it("не задає висоту від екрана пристрою", () => {
    // Регресія: `min-height: 100dvh` усередині вже обмеженого контейнера —
    // гарантований зайвий екран прокрутки на кожному з п'яти питань.
    expect(rule(".wb-run")).not.toMatch(/\d+d?vh/);
  });

  it("кнопка кроку притискається до низу колонки, а не тоне в списку", () => {
    expect(rule(".wb-run > .wb-btn")).toContain("margin-top: auto");
  });

  it("«далі» до вибору не виглядає як кнопка, на яку можна натиснути", () => {
    const waiting = rule(".wb-btn-waiting");
    expect(waiting).toContain("background: transparent");
    expect(waiting).toContain("var(--text-muted)");
  });
});

/**
 * Розмір заголовків секцій на картці результату.
 *
 * Власник 29.09.2026 показав скриншот, де «На що варто звернути увагу»
 * займав два рядки й виглядав більшим за текст під ним. Причина була не в
 * розміті: `apple.css` і `android.css` піднімають **будь-який** `h2` до
 * 28px/22px через `!important`, а ці заголовки — `h2`. Тобто правило секції
 * (`0.9375rem`) просто не діяло.
 */
describe("заголовки секцій результату", () => {
  it("не піднімаються бренд-темою до розміру заголовка екрана", () => {
    for (const selector of [".wb-section-title", ".wb-alerts-title"]) {
      expect(rule(selector), selector).toContain("font-size: 0.9375rem !important");
    }
  });
});
