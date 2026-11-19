/**
 * Нові датові лінзи: кожна таблиця повна, доказ називає вихід системи, а
 * якості розкидані кількома доменами. Тест не перевіряє «істинність» традиції —
 * лише те, що правило відтворюване й не мовчить.
 *
 * @module packages/shared/src/qualities/lenses/date-lenses.test
 */

import { describe, expect, it } from "vitest";
import { QUALITY_DOMAINS } from "../domains";
import { CHINESE, CHINESE_ANIMALS, chineseClaims } from "./chinese";
import { MAYAN, MAYAN_DAY_SIGNS, mayanClaims } from "./mayan";
import { NUMEROLOGY, NUMEROLOGY_NUMBERS, numerologyClaims } from "./numerology";

describe("нумерологія", () => {
  it("покриває всі числа 1–9 і майстер-числа 11, 22", () => {
    expect([...NUMEROLOGY_NUMBERS].sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22,
    ]);
    expect(NUMEROLOGY.layer).toBe("symbolic");
  });

  it("доказ називає число, рівень у шкалі, домени різні", () => {
    const claims = numerologyClaims(6);
    expect(claims).toHaveLength(4);
    expect(claims.every((claim) => claim.evidence.startsWith("Число життєвого шляху 6:"))).toBe(
      true,
    );
    expect(new Set(claims.map((claim) => claim.level))).toEqual(new Set([3, 4]));
    const domains = new Set(
      claims.map(
        (claim) =>
          QUALITY_DOMAINS.find((domain) =>
            domain.qualities.some((quality) => quality.id === claim.qualityId),
          )?.id,
      ),
    );
    expect(domains.size).toBeGreaterThanOrEqual(2);
  });

  it("невідоме число не отримує рівня", () => {
    expect(() => numerologyClaims(10)).toThrow(/таблиці нумерології/);
  });
});

describe("китайська традиція", () => {
  it("дванадцять тварин у циклі, кожна має правило", () => {
    expect(CHINESE_ANIMALS).toHaveLength(12);
    expect(new Set(CHINESE_ANIMALS).size).toBe(12);
    expect(CHINESE.layer).toBe("symbolic");
  });

  it("Мавпа дає чотири свідчення з власним доказом", () => {
    const claims = chineseClaims("Мавпа");
    expect(claims).toHaveLength(4);
    expect(claims.every((claim) => claim.evidence.startsWith("Рік Мавпи за Лічунем:"))).toBe(true);
    expect(claims.map((claim) => claim.qualityId)).toContain("playfulness");
  });

  it("невідома тварина кидає, а не вигадує рівень", () => {
    expect(() => chineseClaims("Єдиноріг")).toThrow(/китайської лінзи/);
  });
});

describe("маянський Цолькін", () => {
  it("двадцять печаток, кожна має правило", () => {
    expect(MAYAN_DAY_SIGNS).toHaveLength(20);
    expect(new Set(MAYAN_DAY_SIGNS).size).toBe(20);
    expect(MAYAN.layer).toBe("symbolic");
  });

  it("день і тон входять у доказ, рівні не множаться тоном", () => {
    const claims = mayanClaims("Кауак", 9);
    expect(claims).toHaveLength(3);
    expect(claims.every((claim) => claim.evidence.startsWith("День Цолькіна 9 Кауак:"))).toBe(true);
    expect(claims.map((claim) => claim.level)).toEqual([4, 4, 3]);
  });

  it("тон поза шкалою 1–13 — помилка", () => {
    expect(() => mayanClaims("Кауак", 14)).toThrow(/поза шкалою/);
  });
});
