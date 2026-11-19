/**
 * 20 пунктів, 5 факторів, зворотні твердження: чотири пункти на фактор, чинні
 * смуги й відсутність порогу уваги. Зворотний пункт — головне місце помилки:
 * без перевертання людина отримує протилежний рівень.
 * @module @wwwuabot/shared/assessments/bigfive.test
 */

import { describe, expect, it } from "vitest";
import { BIG_FIVE } from "./bigfive";
import { getAssessment } from "./registry";
import { bandOf, exceedsAttention, profileOf, scoreAssessment, validateAnswers } from "./score";

/** Відповіді, узгоджені з фактором: прямі — 5, зворотні — 1. */
function consistent(): number[] {
  return BIG_FIVE.items.map((item) => (item.reverse ? 1 : 5));
}

/** Протилежні відповіді: прямі — 1, зворотні — 5. */
function opposite(): number[] {
  return BIG_FIVE.items.map((item) => (item.reverse ? 5 : 1));
}

describe("реєстр", () => {
  it("«Велика п'ятірка» доступна за ключем, як і решта тестів", () => {
    expect(getAssessment("bigfive")).toBe(BIG_FIVE);
  });

  it("двадцять тверджень, по чотири на кожен із п'яти факторів", () => {
    expect(BIG_FIVE.items).toHaveLength(20);
    expect(BIG_FIVE.scales).toHaveLength(5);
    for (const scale of BIG_FIVE.scales) {
      const own = BIG_FIVE.items.filter((item) => item.scale === scale.key);
      expect(own, scale.key).toHaveLength(4);
      // Обидва напрямки в кожному факторі: без зворотного пункту згода з усім
      // читалася б як максимум, а це неправда.
      expect(
        own.some((item) => item.reverse),
        scale.key,
      ).toBe(true);
      expect(
        own.some((item) => !item.reverse),
        scale.key,
      ).toBe(true);
    }
  });

  it("смуги покривають кожну можливу суму фактора — від 4 до 20", () => {
    for (const scale of BIG_FIVE.scales) {
      for (let raw = 4; raw <= 20; raw += 1) {
        expect(bandOf(scale, raw), `${scale.key}:${raw}`).not.toBeNull();
      }
      expect(scale.bands).toHaveLength(5);
    }
  });
});

describe("рахунок", () => {
  it("узгоджені відповіді дають максимум фактора", () => {
    const result = scoreAssessment(BIG_FIVE, consistent());

    // Зворотні пункти перевертаються, тож «погодитися з усім» = погодитися з
    // фактором, а не з текстом кожного твердження.
    expect(result.scales.map((one) => one.raw)).toEqual([20, 20, 20, 20, 20]);
    expect(result.scales.every((one) => one.band.label === "Дуже високий")).toBe(true);
  });

  it("зворотні твердження перевертають бал, а не текст", () => {
    const result = scoreAssessment(BIG_FIVE, opposite());

    // Без перевертання тут було б 20: людина погодилася з усіма пунктами.
    expect(result.scales.map((one) => one.raw)).toEqual([4, 4, 4, 4, 4]);
    expect(result.scales.every((one) => one.band.label === "Дуже низький")).toBe(true);
  });

  it("«найсильніше» і «найслабше» читають зворотний пункт у той самий бік", () => {
    const answers = consistent();
    const scale = BIG_FIVE.scales[0];
    if (!scale) throw new Error("У тесті немає першої шкали.");
    const profile = profileOf(BIG_FIVE, scale, answers);

    // Усі чотири відповіді узгоджені, тож розкиду немає — і це не «випадкова
    // сфера», а чесне «все рівно».
    expect(profile.even).toBe(true);
    expect(profile.strongest.value).toBe(5);
  });

  it("у рис немає порогу уваги: високий рівень не гірший за низький", () => {
    for (const scale of BIG_FIVE.scales) {
      expect(scale.attentionRaw).toBeUndefined();
      expect(exceedsAttention(scale, 4)).toBe(false);
      expect(exceedsAttention(scale, 20)).toBe(false);
    }
    expect(scoreAssessment(BIG_FIVE, opposite()).needsAttention).toBe(false);
  });

  it("неповні відповіді й відповіді поза шкалою відхиляються", () => {
    expect(validateAnswers(BIG_FIVE, consistent().slice(0, 19))).toContain("20");
    const broken = consistent();
    broken[3] = 0;
    expect(validateAnswers(BIG_FIVE, broken)).not.toBeNull();
  });
});
