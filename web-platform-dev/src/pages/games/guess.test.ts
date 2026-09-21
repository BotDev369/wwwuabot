/**
 * Правила «вгадай число» — те, що ламається мовчки.
 *
 * Головне тут — **знак**: «більше» замість «менше» робить гру нерешаємою, а
 * виглядає це як звичайний текст. Друге — **межі**: число поза діапазоном не
 * мусить ставати спробою, бо тоді людина витрачає їх на промахи пальцем.
 * Третє — **діапазон**: саме він малює смугу, і помилка в ньому дає екран, що
 * показує одне, а відповідає іншим.
 *
 * @module web-platform-dev/src/pages/games/guess.test
 */

import { describe, expect, it } from "vitest";
import {
  GUESS_MAX,
  GUESS_MIN,
  boundsOf,
  parseGuess,
  randomSecret,
  verdict,
  type GuessAttempt,
} from "./guess";

/** Спроба з відповіддю — так значення й вердикт стоять поруч, як у грі. */
function attempt(value: number, answer: "lower" | "higher" | "hit"): GuessAttempt {
  return { value, verdict: answer };
}

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

describe("діапазон, який лишився", () => {
  it("до першої спроби можливе все", () => {
    expect(boundsOf([])).toEqual({ low: GUESS_MIN, high: GUESS_MAX });
  });

  it("«більше» піднімає нижню межу, «менше» опускає верхню", () => {
    expect(boundsOf([attempt(40, "higher")])).toEqual({ low: 41, high: GUESS_MAX });
    expect(boundsOf([attempt(70, "lower")])).toEqual({ low: GUESS_MIN, high: 69 });
  });

  it("звужується з кожною спробою, а не смикається", () => {
    const attempts = [attempt(40, "higher"), attempt(70, "lower"), attempt(55, "higher")];
    expect(boundsOf(attempts)).toEqual({ low: 56, high: 69 });
  });

  it("спроба за межами відомого не розширює діапазон назад", () => {
    // Уже відомо, що загадане менше 75; спроба 90 нічого не відкриває —
    // інакше смуга росла б від власного промаху.
    const attempts = [attempt(75, "lower"), attempt(90, "lower")];
    expect(boundsOf(attempts)).toEqual({ low: GUESS_MIN, high: 74 });
  });

  it("удар у саму межу нічого не ламає", () => {
    expect(boundsOf([attempt(GUESS_MIN, "higher")])).toEqual({ low: 2, high: GUESS_MAX });
    expect(boundsOf([attempt(GUESS_MAX, "lower")])).toEqual({ low: GUESS_MIN, high: 99 });
  });

  it("вгадування діапазон не рухає: воно вже не про нього", () => {
    expect(boundsOf([attempt(42, "hit")])).toEqual({ low: GUESS_MIN, high: GUESS_MAX });
  });
});
