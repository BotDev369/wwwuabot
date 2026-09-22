/**
 * Форми множини — три, і помиляються в них мовчки.
 *
 * «11 спроба» читається як помилка, але код її не бачить — тож перевіряємо
 * обидва відмінки й окремо числа 11–14, на яких ламається просте правило
 * «остання цифра».
 *
 * @module web-platform-dev/src/pages/games/plural.test
 */

import { describe, expect, it } from "vitest";
import { ATTEMPTS, ATTEMPTS_ACCUSATIVE, FISH, plural } from "./plural";

describe("форми множини", () => {
  it("називний: 1 спроба, 2 спроби, 5 спроб", () => {
    expect(plural(1, ATTEMPTS)).toBe("спроба");
    expect(plural(2, ATTEMPTS)).toBe("спроби");
    expect(plural(4, ATTEMPTS)).toBe("спроби");
    expect(plural(5, ATTEMPTS)).toBe("спроб");
    expect(plural(0, ATTEMPTS)).toBe("спроб");
  });

  it("11–14 беруть форму множини, хоч і закінчуються на 1–4", () => {
    expect(plural(11, ATTEMPTS)).toBe("спроб");
    expect(plural(12, ATTEMPTS)).toBe("спроб");
    expect(plural(14, ATTEMPTS)).toBe("спроб");
    expect(plural(111, ATTEMPTS)).toBe("спроб");
  });

  it("двадцять одне — знову однина", () => {
    expect(plural(21, ATTEMPTS)).toBe("спроба");
    expect(plural(22, ATTEMPTS)).toBe("спроби");
    expect(plural(25, ATTEMPTS)).toBe("спроб");
  });

  it("знахідний: за 1 спробу", () => {
    expect(plural(1, ATTEMPTS_ACCUSATIVE)).toBe("спробу");
    expect(plural(3, ATTEMPTS_ACCUSATIVE)).toBe("спроби");
    expect(plural(8, ATTEMPTS_ACCUSATIVE)).toBe("спроб");
  });

  it("рибалка: 1 риба, 2 риби, 5 риб", () => {
    expect(plural(1, FISH)).toBe("риба");
    expect(plural(3, FISH)).toBe("риби");
    expect(plural(12, FISH)).toBe("риб");
    expect(plural(0, FISH)).toBe("риб");
  });
});
