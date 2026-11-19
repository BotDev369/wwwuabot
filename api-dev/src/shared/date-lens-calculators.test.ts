/**
 * Датові калькулятори: кожен перевіряється на ручному прикладі й на межі.
 * Кореляція Цолькіна — відома дата 4 Ахау, а не «схоже на правду».
 *
 * @module api-dev/src/shared/date-lens-calculators.test
 */

import { describe, expect, it } from "vitest";
import {
  chineseAnimalOf,
  chineseYearOf,
  lifePathOf,
  parseIsoDate,
  tzolkinOf,
} from "./date-lens-calculators";

describe("parseIsoDate", () => {
  it("неіснуюча дата — null, а не сусідній день", () => {
    expect(parseIsoDate("1980-02-31")).toBeNull();
    expect(parseIsoDate("03.03.1980")).toBeNull();
    expect(parseIsoDate("1980-03-03")).toEqual({ year: 1980, month: 3, day: 3 });
  });
});

describe("lifePathOf", () => {
  it("згортає суму цифр до 6 для 1980-03-03", () => {
    expect(lifePathOf("1980-03-03")).toBe(6);
  });

  it("лишає майстер-число 11, а не згортає до 2", () => {
    // 1+9+8+7+1+1+2+9 = 38 → 11
    expect(lifePathOf("1987-11-29")).toBe(11);
  });

  it("лишає майстер-число 22, а не згортає до 4", () => {
    // 1+9+8+0+0+1+0+3 = 22
    expect(lifePathOf("1980-01-03")).toBe(22);
  });
});

describe("китайський рік", () => {
  it("1980-03-03 — рік Мавпи", () => {
    expect(chineseYearOf("1980-03-03")).toBe(1980);
    expect(chineseAnimalOf("1980-03-03")).toBe("Мавпа");
  });

  it("до Лічуня діє попередній рік", () => {
    expect(chineseYearOf("1980-02-03")).toBe(1979);
    expect(chineseAnimalOf("1980-02-03")).toBe("Коза");
  });

  it("4 лютого вже новий рік", () => {
    expect(chineseAnimalOf("1980-02-04")).toBe("Мавпа");
  });
});

describe("Цолькін", () => {
  it("1980-03-03 — 9 Кауак", () => {
    expect(tzolkinOf("1980-03-03")).toEqual({ sign: "Кауак", tone: 9 });
  });

  it("2012-12-21 — 4 Ахау: кореляція від позначеної дати", () => {
    expect(tzolkinOf("2012-12-21")).toEqual({ sign: "Ахау", tone: 4 });
  });
});
