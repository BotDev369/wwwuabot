/**
 * Датові системи: таблиця повна, доказ називає показник, а кожне свідчення
 * несе ланцюг «дата → показник → правило → рівень». Тест не перевіряє
 * «істинність» традиції — лише відтворюваність правила.
 *
 * @module packages/shared/src/qualities/lenses/date-lenses.test
 */

import { describe, expect, it } from "vitest";
import { QUALITY_DOMAINS } from "../domains";
import {
  CHINESE,
  CHINESE_ANIMALS,
  chineseClaims,
  type ChineseProfile,
  type Pillar,
} from "./chinese";
import { MAYAN, MAYAN_DAY_SIGNS, mayanClaims, type MayanProfile } from "./mayan";
import {
  NUMEROLOGY,
  NUMEROLOGY_NUMBERS,
  numerologyClaims,
  type NumerologyProfile,
} from "./numerology";

function pillar(
  label: string,
  element: string,
  polarity: string,
  animal: string,
  branchIndex: number,
): Pillar {
  return { stem: "Тест", branch: "Тест", label, element, polarity, animal, branchIndex };
}

const NUMEROLOGY_SAMPLE: NumerologyProfile = {
  date: "1980-03-03",
  lifePath: 6,
  lifePathChain: [15, 6],
  birthday: 3,
  attitude: 6,
  personalYear: 7,
  personalYearOf: 2026,
  pinnacles: [6, 3, 9, 3],
  challenges: [0, 6, 6, 6],
  pinnacleAges: [0, 30, 39, 48],
  karmicDebt: null,
  karmicWhere: null,
};

const CHINESE_SAMPLE: ChineseProfile = {
  date: "1980-03-03",
  solarLongitude: 343.08,
  solarTerm: "Лі Чунь",
  solarYear: 1980,
  year: pillar("Ґен-Шень", "Метал", "ян", "Мавпа", 8),
  month: pillar("У-Інь", "Земля", "ян", "Тигр", 2),
  day: pillar("Ї-Хай", "Дерево", "їнь", "Свиня", 11),
  monthIndex: 0,
};

const MAYAN_SAMPLE: MayanProfile = {
  date: "1980-03-03",
  julianDay: 2444302,
  days: 1860019,
  kin: 139,
  tone: 9,
  toneName: "Сонячна",
  seal: "Кауак",
  sealIndex: 18,
  trecena: 11,
  wave: "1 Ік",
  waveKin: 131,
  longCount: "12.18.6.12.19",
};

describe("нумерологія", () => {
  it("покриває 1–9 і всі три майстер-числа", () => {
    expect([...NUMEROLOGY_NUMBERS].sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 22, 33,
    ]);
    expect(NUMEROLOGY.layer).toBe("symbolic");
    expect(NUMEROLOGY.version).toBe("2");
  });

  it("шість показників дають свідчення з ланцюгом і без повторів якості", () => {
    const claims = numerologyClaims(NUMEROLOGY_SAMPLE);
    expect(claims.length).toBeGreaterThanOrEqual(6);
    expect(new Set(claims.map((claim) => claim.qualityId)).size).toBe(claims.length);
    for (const claim of claims) {
      expect(claim.details?.length).toBeGreaterThanOrEqual(3);
      expect(claim.details?.join(" ")).toContain("1980-03-03");
      expect(claim.details?.join(" ")).toContain("Правило:");
    }
    const domains = new Set(
      claims.map(
        (claim) =>
          QUALITY_DOMAINS.find((domain) =>
            domain.qualities.some((quality) => quality.id === claim.qualityId),
          )?.id,
      ),
    );
    expect(domains.size).toBeGreaterThanOrEqual(3);
  });

  it("майстер-число й кармічний борг потрапляють у доказ", () => {
    const claims = numerologyClaims({
      ...NUMEROLOGY_SAMPLE,
      lifePath: 11,
      lifePathChain: [11],
      karmicDebt: 19,
      karmicWhere: "рік 1990 згортається через 19",
    });
    expect(claims.some((claim) => claim.details?.join(" ").includes("кармічний борг 19"))).toBe(
      true,
    );
  });
});

describe("китайська традиція", () => {
  it("дванадцять тварин, три стовпи й людський опис", () => {
    expect(CHINESE_ANIMALS).toHaveLength(12);
    expect(new Set(CHINESE_ANIMALS).size).toBe(12);
    expect(CHINESE.version).toBe("2");
    expect(CHINESE.limits?.join(" ")).toContain("години");
  });

  it("рік, місяць і день дають свідчення з елементом і полярністю", () => {
    const claims = chineseClaims(CHINESE_SAMPLE);
    expect(claims.length).toBeGreaterThanOrEqual(6);
    expect(claims.some((claim) => claim.evidence.startsWith("Рік Мавпи:"))).toBe(true);
    expect(claims.some((claim) => claim.evidence.startsWith("Стихія року Метал:"))).toBe(true);
    expect(claims.some((claim) => claim.evidence.startsWith("Полярність року ян:"))).toBe(true);
    const details = claims.map((claim) => claim.details?.join(" ") ?? "").join(" ");
    expect(details).toContain("Місячний стовп: У-Інь");
    expect(details).toContain("Денний стовп: Ї-Хай");
    expect(claims.some((claim) => claim.details?.join(" ").includes("Лі Чунь"))).toBe(true);
  });
});

describe("Цолькін", () => {
  it("двадцять печаток і тринадцять тонів", () => {
    expect(MAYAN_DAY_SIGNS).toHaveLength(20);
    expect(new Set(MAYAN_DAY_SIGNS).size).toBe(20);
    expect(MAYAN.version).toBe("2");
    expect(MAYAN.limits?.join(" ")).toContain("GMT 584283");
  });

  it("печатка, тон, хвиля й довга лічба є в доказі", () => {
    const claims = mayanClaims(MAYAN_SAMPLE);
    expect(claims.length).toBeGreaterThanOrEqual(4);
    expect(claims.every((claim) => claim.details?.join(" ").includes("12.18.6.12.19"))).toBe(true);
    expect(claims.some((claim) => claim.details?.join(" ").includes("Трецена 11"))).toBe(true);
    expect(claims.some((claim) => claim.details?.join(" ").includes("тон 9"))).toBe(true);
  });
});
