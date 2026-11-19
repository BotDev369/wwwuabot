/**
 * Досьє за датою: людина отримує свідчення, подія — чесне «ще не описано».
 *
 * @module api-dev/src/services/quality-dossier.service.test
 */

import { describe, expect, it } from "vitest";
import { buildDossier, sunSignOf } from "./quality-dossier.service";

describe("sunSignOf", () => {
  it("бере знак із калькулятора західної системи", () => {
    expect(sunSignOf("1980-03-03")).toBe("Риби");
  });
});

describe("buildDossier", () => {
  it("людина отримує свідчення своєї лінзи", () => {
    const dossier = buildDossier("1980-03-03", "person");
    expect(dossier.symbol).toBe("Риби");
    expect(dossier.claims).toHaveLength(3);
    expect(dossier.claims.every((claim) => claim.layer === "symbolic")).toBe(true);
    expect(dossier.note).toBeNull();
  });

  it("подія не отримує рис людини — це інший профіль", () => {
    const dossier = buildDossier("1980-03-03", "event");
    expect(dossier.claims).toEqual([]);
    expect(dossier.note).toBe("event-not-modelled");
    // Символ дня лишається: він не риса, а мова дати.
    expect(dossier.symbol).toBe("Риби");
  });
});
