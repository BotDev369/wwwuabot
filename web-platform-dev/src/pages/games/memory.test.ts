/**
 * Правила «Знайди пару» — те, що ламається мовчки.
 *
 * Колода з трьома однаковими знаками не помітна оком до середини партії, а
 * тоді вже пізно: пара, яку неможливо знайти, просто не дає скінчити гру.
 *
 * @module web-platform-dev/src/pages/games/memory.test
 */

import { describe, expect, it } from "vitest";
import { DECK_SIZE, SYMBOLS, deal, isDone, samePair, symbolOf } from "./memory";

describe("колода", () => {
  it("кожен знак лежить рівно двічі", () => {
    const cards = deal();
    const counts = new Map<number, number>();
    for (const card of cards) counts.set(card.pair, (counts.get(card.pair) ?? 0) + 1);

    expect(cards).toHaveLength(DECK_SIZE);
    expect(counts.size).toBe(SYMBOLS.length);
    for (const count of counts.values()) expect(count).toBe(2);
  });

  it("номери карток не повторюються", () => {
    const ids = deal().map((card) => card.id);
    expect(new Set(ids).size).toBe(DECK_SIZE);
  });

  it("перемішує позиції, а не знаки", () => {
    // Той самий «випадок» дає ту саму роздачу — інакше тест не тестує нічого
    const first = deal(() => 0.5).map((card) => card.pair);
    const second = deal(() => 0.5).map((card) => card.pair);
    expect(first).toEqual(second);

    // А різні «випадки» тасують — інакше колода завжди лягала б однаково
    const other = deal(() => 0.9).map((card) => card.pair);
    expect(other).not.toEqual(first);
  });
});

describe("пара", () => {
  it("дві картки одного знака — пара", () => {
    expect(samePair({ id: 0, pair: 3 }, { id: 7, pair: 3 })).toBe(true);
    expect(samePair({ id: 0, pair: 3 }, { id: 7, pair: 4 })).toBe(false);
  });

  it("знак картки приходить із реєстру — з іконкою і словом", () => {
    for (let pair = 0; pair < SYMBOLS.length; pair++) {
      const symbol = symbolOf({ id: pair, pair });
      expect(symbol.icon).toBe(SYMBOLS[pair]?.icon);
      // Слово потрібне для `aria-label`: ім'я іконки людині нічого не каже
      expect(symbol.label.length).toBeGreaterThan(1);
    }
  });

  it("невідомий знак не валить екран", () => {
    expect(symbolOf({ id: 99, pair: 99 }).icon).toBe("star");
  });
});

describe("кінець партії", () => {
  it("партія скінчена, коли відкриті всі картки", () => {
    expect(isDone([])).toBe(false);
    expect(isDone(Array.from({ length: DECK_SIZE - 1 }, (_, at) => at))).toBe(false);
    expect(isDone(Array.from({ length: DECK_SIZE }, (_, at) => at))).toBe(true);
  });
});
