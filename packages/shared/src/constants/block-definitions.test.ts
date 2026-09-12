import { describe, it, expect } from "vitest";
import { getBlockDefinition, getBlocksForZone } from "./block-definitions";
import { ALL_ZONES } from "../types/page-config";

describe("Page Builder New Blocks", () => {
  it('should define "nav" (Меню) with all compatible zones', () => {
    const nav = getBlockDefinition("nav");
    expect(nav).toBeDefined();
    expect(nav?.label).toBe("Меню");
    for (const zone of ALL_ZONES) {
      expect(nav?.compatibleZones).toContain(zone);
    }
  });

  it('should define "link-button" (Кнопка посилання) with all compatible zones', () => {
    const linkBtn = getBlockDefinition("link-button");
    expect(linkBtn).toBeDefined();
    expect(linkBtn?.label).toBe("Кнопка посилання");
    for (const zone of ALL_ZONES) {
      expect(linkBtn?.compatibleZones).toContain(zone);
    }
  });

  it('should define "theme" (Тема) with all compatible zones', () => {
    const theme = getBlockDefinition("theme");
    expect(theme).toBeDefined();
    expect(theme?.label).toBe("Тема");
    for (const zone of ALL_ZONES) {
      expect(theme?.compatibleZones).toContain(zone);
    }
  });

  it("should return nav, link-button, and theme in getBlocksForZone for every zone", () => {
    for (const zone of ALL_ZONES) {
      const blocks = getBlocksForZone(zone);
      const types = blocks.map((b) => b.type);
      expect(types).toContain("nav");
      expect(types).toContain("link-button");
      expect(types).toContain("theme");
    }
  });
});
