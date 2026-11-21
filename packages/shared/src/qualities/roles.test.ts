/**
 * Ролі: правила лежать у ядрі й перевіряються тут. Стережеться головне:
 * виміряне перекриває символічне, а «немає даних» не стає ризиком.
 *
 * @module packages/shared/src/qualities/roles.test
 */

import { describe, expect, it } from "vitest";
import { getQuality } from "./domains";
import {
  LAYER_PRIORITY,
  ROLES,
  getRole,
  matchRole,
  parseRole,
  resolveQuality,
  type RoleDefinition,
} from "./roles";
import type { ClaimLayer, QualityClaim, QualityLevel } from "./types";

function claim(
  qualityId: string,
  level: QualityLevel,
  layer: ClaimLayer = "symbolic",
  sourceId = layer === "measured" ? "bigfive" : "western",
): QualityClaim {
  return {
    qualityId,
    level,
    layer,
    sourceId,
    sourceVersion: "1",
    evidence: `${qualityId}: ${level}`,
    method: layer === "measured" ? "direct" : "mapped",
    temporal: "trait",
    confidence: layer === "measured" ? 0.9 : 0.3,
  };
}

const ROLE: RoleDefinition = {
  id: "friend",
  name: "Тестова роль",
  lead: "",
  needs: [
    { qualityId: "empathy", threshold: 4, risk: 2, sourceId: "test" },
    { qualityId: "honesty", threshold: 3, risk: 2, sourceId: "test" },
  ],
  sources: [{ id: "test", title: "Тест", note: "" }],
};

describe("правила ролей", () => {
  it("чотири ролі, і кожна потреба має якість ядра та джерело", () => {
    expect(ROLES.map((role) => role.id)).toEqual(["partner", "friend", "business", "employee"]);
    for (const role of ROLES) {
      expect(role.needs.length).toBeGreaterThanOrEqual(6);
      const sourceIds = new Set(role.sources.map((source) => source.id));
      for (const need of role.needs) {
        expect(getQuality(need.qualityId), `${role.id}: ${need.qualityId}`).not.toBeNull();
        expect(sourceIds.has(need.sourceId), `${role.id}: ${need.sourceId}`).toBe(true);
        expect(need.risk).toBeLessThan(need.threshold);
      }
    }
  });

  it("ключ ролі з адреси не ламає екран", () => {
    expect(parseRole("business")).toBe("business");
    expect(parseRole("невідомо")).toBe("partner");
    expect(getRole(null).name).toBe("Половинка");
  });

  it("виміряне перекриває символічне, а не усереднюється", () => {
    const quality = getQuality("empathy")!;
    const resolved = resolveQuality(
      [claim("empathy", 5, "symbolic"), claim("empathy", 2, "measured")],
      quality,
    );
    expect(resolved.level).toBe(2);
    expect(resolved.layer).toBe("measured");
    expect(resolved.sources).toEqual(["bigfive"]);
    expect(LAYER_PRIORITY.measured).toBeGreaterThan(LAYER_PRIORITY.symbolic);
  });

  it("наратив перекриває дату, а розбіжність у шарі лишається без рівня", () => {
    const quality = getQuality("empathy")!;
    const narrative = resolveQuality(
      [claim("empathy", 5, "symbolic"), claim("empathy", 3, "narrative", "interview")],
      quality,
    );
    expect(narrative.level).toBe(3);
    expect(narrative.layer).toBe("narrative");

    const split = resolveQuality(
      [claim("empathy", 4, "measured"), claim("empathy", 2, "measured")],
      quality,
    );
    expect(split.level).toBeNull();
    expect(split.unsettled).toBe(true);
    expect(split.layer).toBe("measured");
  });

  it("без свідчень рівня немає — це не низький рівень", () => {
    const resolved = resolveQuality([], getQuality("empathy")!);
    expect(resolved.level).toBeNull();
    expect(resolved.sources).toEqual([]);
    expect(resolved.unsettled).toBe(false);
  });
});

describe("оцінка ролі для пари", () => {
  const anna = {
    label: "Анна",
    claims: [claim("empathy", 5), claim("honesty", 4), claim("care", 5)],
  };
  const bohdan = {
    label: "Богдан",
    claims: [claim("empathy", 4), claim("honesty", 2)],
  };

  it("опора — коли рівень достатній у кожного", () => {
    const result = matchRole(ROLE, [anna, bohdan]);
    expect(result.support.map((one) => one.quality.id)).toEqual(["empathy"]);
    expect(result.neutral.map((one) => one.quality.id)).toEqual(["honesty"]);
  });

  it("ризик — коли низько в обох, а не в одного", () => {
    const low = { label: "Низький", claims: [claim("empathy", 2), claim("honesty", 1)] };
    const result = matchRole(ROLE, [low, low]);
    expect(result.risk.map((one) => one.quality.id)).toEqual(["empathy", "honesty"]);
  });

  it("якість без даних в одного — «немає даних», а не ризик", () => {
    const silent = { label: "Без даних", claims: [claim("honesty", 4)] };
    const result = matchRole(ROLE, [anna, silent]);
    const empathy = result.unknown.find((one) => one.quality.id === "empathy");
    expect(empathy?.status).toBe("unknown");
    expect(empathy?.people[1].level).toBeNull();
    expect(result.risk.map((one) => one.quality.id)).not.toContain("empathy");
  });

  it("домени ролі показують, де опора, а де прогалина", () => {
    const result = matchRole(ROLE, [anna, bohdan]);
    expect(result.domains.length).toBeGreaterThan(0);
    expect(result.domains.some((domain) => domain.support > 0)).toBe(true);
    expect(result.domains.every((domain) => domain.neutral + domain.support > 0)).toBe(true);
  });

  it("виміряне в парі перекриває дату", () => {
    const measured = {
      label: "Виміряний",
      claims: [claim("empathy", 2, "measured"), claim("empathy", 5, "symbolic")],
    };
    const result = matchRole(ROLE, [measured, bohdan]);
    const empathy = result.neutral.find((one) => one.quality.id === "empathy");
    expect(empathy?.people[0].level).toBe(2);
    expect(empathy?.status).toBe("neutral");
  });
});
