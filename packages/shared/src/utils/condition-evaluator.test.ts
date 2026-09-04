import { describe, it, expect } from "vitest";
import {
  evaluateConditions,
  resolveBlock,
  getAvailableConditionFields,
} from "./condition-evaluator";
import type { UserProfile, BlockConditions } from "../types/page-config";

describe("evaluateConditions", () => {
  const baseUser: UserProfile = {
    id: 1,
    role: "admin",
    tariff: "pro",
    status: "active",
    discount: 15,
    permissions: ["analytics", "export", "settings"],
  };

  it("returns true when conditions is undefined", () => {
    expect(evaluateConditions(undefined, baseUser)).toBe(true);
    expect(evaluateConditions(undefined, undefined)).toBe(true);
  });

  it("returns false when conditions exist but user is undefined", () => {
    const conditions: BlockConditions = { role: ["admin"] };
    expect(evaluateConditions(conditions, undefined)).toBe(false);
  });

  describe("role checks", () => {
    it("matches when user role is in the allowed list", () => {
      expect(evaluateConditions({ role: ["admin", "moderator"] }, baseUser)).toBe(true);
    });

    it("fails when user role is not in the allowed list", () => {
      expect(evaluateConditions({ role: ["user", "guest"] }, baseUser)).toBe(false);
    });

    it("fails gracefully when user has no role defined", () => {
      const userWithoutRole: UserProfile = { id: 2 };
      expect(evaluateConditions({ role: ["admin"] }, userWithoutRole)).toBe(false);
    });
  });

  describe("tariff checks", () => {
    it("matches when user tariff is included", () => {
      expect(evaluateConditions({ tariff: ["basic", "pro"] }, baseUser)).toBe(true);
    });

    it("fails when user tariff is not included", () => {
      expect(evaluateConditions({ tariff: ["enterprise"] }, baseUser)).toBe(false);
    });
  });

  describe("status checks", () => {
    it("matches when user status is included", () => {
      expect(evaluateConditions({ status: ["active"] }, baseUser)).toBe(true);
    });

    it("fails when user status does not match", () => {
      expect(evaluateConditions({ status: ["suspended", "pending"] }, baseUser)).toBe(false);
    });
  });

  describe("minDiscount checks", () => {
    it("passes when user discount is greater than or equal to minDiscount", () => {
      expect(evaluateConditions({ minDiscount: 10 }, baseUser)).toBe(true);
      expect(evaluateConditions({ minDiscount: 15 }, baseUser)).toBe(true);
    });

    it("fails when user discount is lower than minDiscount", () => {
      expect(evaluateConditions({ minDiscount: 20 }, baseUser)).toBe(false);
    });

    it("treats missing user discount as 0", () => {
      const userNoDiscount: UserProfile = { id: 3 };
      expect(evaluateConditions({ minDiscount: 5 }, userNoDiscount)).toBe(false);
    });
  });

  describe("permissions checks", () => {
    it("passes when user has all required permissions", () => {
      expect(evaluateConditions({ permissions: ["analytics", "export"] }, baseUser)).toBe(true);
    });

    it("fails when user is missing at least one required permission", () => {
      expect(evaluateConditions({ permissions: ["analytics", "billing"] }, baseUser)).toBe(false);
    });

    it("fails when user has no permissions array", () => {
      const userNoPerms: UserProfile = { id: 4 };
      expect(evaluateConditions({ permissions: ["analytics"] }, userNoPerms)).toBe(false);
    });
  });

  describe("fieldMatch checks", () => {
    it("matches nested fields via dot-notation", () => {
      const complexUser: any = {
        id: 5,
        metadata: {
          verified: true,
          country: "UA",
        },
      };
      expect(
        evaluateConditions(
          { fieldMatch: { "metadata.verified": true, "metadata.country": "UA" } },
          complexUser
        )
      ).toBe(true);
    });

    it("fails when nested field value does not match", () => {
      const complexUser: any = {
        id: 5,
        metadata: {
          country: "PL",
        },
      };
      expect(
        evaluateConditions({ fieldMatch: { "metadata.country": "UA" } }, complexUser)
      ).toBe(false);
    });
  });
});

describe("resolveBlock", () => {
  const user: UserProfile = { id: 1, role: "admin" };

  it("shows block directly when conditions are met or empty", () => {
    expect(resolveBlock({}, user)).toEqual({ show: true, useFallback: false });
    expect(resolveBlock({ conditions: { role: ["admin"] } }, user)).toEqual({
      show: true,
      useFallback: false,
    });
  });

  it("returns fallback when conditions fail and fallback is present", () => {
    const block = {
      conditions: { role: ["moderator"], fallback: true } as BlockConditions,
    };
    expect(resolveBlock(block, user)).toEqual({ show: true, useFallback: true });
  });

  it("hides block when conditions fail and no fallback is set", () => {
    const block = {
      conditions: { role: ["guest"] } as BlockConditions,
    };
    expect(resolveBlock(block, user)).toEqual({ show: false, useFallback: false });
  });
});

describe("getAvailableConditionFields", () => {
  it("returns available condition definitions with labels and types", () => {
    const fields = getAvailableConditionFields();
    expect(fields.length).toBeGreaterThanOrEqual(5);
    const keys = fields.map((f) => f.key);
    expect(keys).toContain("role");
    expect(keys).toContain("tariff");
    expect(keys).toContain("status");
    expect(keys).toContain("minDiscount");
    expect(keys).toContain("permissions");
  });
});
