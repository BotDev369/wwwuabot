/**
 * Досьє за датою: людина отримує свідчення лише вибраних лінз, подія — чесне
 * «ще не описано». Покриття й розбіжність перевіряються на реальній даті.
 *
 * @module api-dev/src/services/quality-dossier.service.test
 */

import { describe, expect, it } from "vitest";
import { getQuality, readDossier, readQuality } from "@wwwuabot/shared/qualities";
import { buildDossier, sunSignOf } from "./quality-dossier.service";

const ALL = ["western", "numerology", "chinese", "mayan"] as const;

describe("sunSignOf", () => {
  it("бере знак із калькулятора західної системи", () => {
    expect(sunSignOf("1980-03-03")).toBe("Риби");
  });
});

describe("buildDossier", () => {
  it("рахує рівно вибрані лінзи, а не всі підряд", () => {
    const onlyWestern = buildDossier("1980-03-03", "person", ["western"]);
    expect(onlyWestern.claims).toHaveLength(3);
    expect(new Set(onlyWestern.claims.map((claim) => claim.sourceId))).toEqual(
      new Set(["western"]),
    );
  });

  it("чотири системи дають чотири джерела й покриття 12 з 36", () => {
    const dossier = buildDossier("1980-03-03", "person", ALL);
    expect(dossier.symbol).toBe("Риби");
    expect(dossier.claims).toHaveLength(14);
    expect(new Set(dossier.claims.map((claim) => claim.sourceId))).toEqual(
      new Set(["western", "numerology", "chinese", "mayan"]),
    );
    expect(dossier.claims.every((claim) => claim.level >= 1 && claim.level <= 5)).toBe(true);
    expect(dossier.note).toBeNull();

    const qualities = readDossier(dossier.claims).flatMap((domain) => domain.qualities);
    expect(qualities.filter((one) => one.claims.length > 0)).toHaveLength(12);
  });

  it("Емпатія розходиться в рівні: обидві позиції лишаються, середнього немає", () => {
    const dossier = buildDossier("1980-03-03", "person", ALL);
    const empathy = getQuality("empathy");
    if (!empathy) throw new Error("empathy відсутня в онтології");

    const reading = readQuality(dossier.claims, empathy);
    expect(reading.divergent).toBe(true);
    expect(reading.level).toBeNull();
    expect(reading.claims.map((claim) => claim.level).sort()).toEqual([3, 4]);
    expect(new Set(reading.claims.map((claim) => claim.sourceId))).toEqual(
      new Set(["western", "numerology"]),
    );
  });

  it("невідома лінза — помилка, а не мовчазний пропуск", () => {
    expect(() => buildDossier("1980-03-03", "person", ["vedic"])).toThrow(/не має датового/);
  });

  it("подія не отримує рис людини — це інший профіль", () => {
    const dossier = buildDossier("1980-03-03", "event", ALL);
    expect(dossier.claims).toEqual([]);
    expect(dossier.note).toBe("event-not-modelled");
    // Символ дня лишається: він не риса, а мова дати.
    expect(dossier.symbol).toBe("Риби");
  });
});
