/**
 * Правила «вгадай число» — те, що ламається мовчки.
 *
 * Головне тут — **знак**: «більше» замість «менше» робить гру нерешаємою, а
 * виглядає це як звичайний текст. Друге — **межі**: число поза діапазоном не
 * мусить ставати спробою, бо тоді людина витрачає їх на промахи пальцем.
 *
 * @module web-platform-dev/src/pages/games/guess.test
 */

import { describe, expect, it } from "vitest";
import { GUESS_MAX, GUESS_MIN, parseGuess, randomSecret, verdict } from "./guess";

describe("порівняння", () => {
  it("каже «менше», коли спроба більша за загадане", () => {
    expect(verdict(42, 80)).toBe("lower");
  });

  it("каже «більше», коли спроба менша за загадане", () => {
    expect(verdict(42, 10)).toBe("higher");
  });

  it("на тому самому числі — «вгадав»", () => {
    expect(verdict(42, 42)).toBe("hit");
  });

  it("межі належать діапазону: і 1, і 100 — справжні числа", () => {
    expect(verdict(GUESS_MIN, GUESS_MIN)).toBe("hit");
    expect(verdict(GUESS_MAX, GUESS_MAX)).toBe("hit");
    expect(verdict(GUESS_MIN, GUESS_MAX)).toBe("lower");
    expect(verdict(GUESS_MAX, GUESS_MIN)).toBe("higher");
  });
});

describe("загадане", () => {
  it("лежить у межах — і в найгіршому випадку теж", () => {
    expect(randomSecret(() => 0)).toBe(GUESS_MIN);
    expect(randomSecret(() => 0.999999)).toBe(GUESS_MAX);
  });

  it("немає «порожнього» значення на жодному кроці випадку", () => {
    for (let step = 0; step < 1; step += 0.05) {
      const secret = randomSecret(() => step);
      expect(secret).toBeGreaterThanOrEqual(GUESS_MIN);
      expect(secret).toBeLessThanOrEqual(GUESS_MAX);
      expect(Number.isInteger(secret)).toBe(true);
    }
  });
});

describe("розбір вводу", () => {
  it("приймає ціле в межах, навіть із пробілами", () => {
    expect(parseGuess(" 42 ")).toBe(42);
    expect(parseGuess(String(GUESS_MIN))).toBe(GUESS_MIN);
    expect(parseGuess(String(GUESS_MAX))).toBe(GUESS_MAX);
  });

  it("не приймає нічого, що не є числом у межах", () => {
    for (const raw of ["", "   ", "абв", "50,5", "0", "101", "-3", "1e5", "Infinity", "NaN"]) {
      expect(parseGuess(raw), raw).toBeNull();
    }
  });
});
