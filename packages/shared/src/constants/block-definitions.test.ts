import { describe, it, expect } from "vitest";
import { getBlockDefinition, getBlocksForZone } from "./block-definitions";
import { ALL_ZONES } from "../types/page-config";
import { DATE_ANALYSIS_PATH, DATE_ANALYSIS_RESULT_PATH } from "../content/sections";

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

/**
 * Блоки «Аналізу дат» живуть у рядках контенту (`scripts/migrations/*-mydate-*.sql`),
 * і адрес екранів дві: `/dateanalysis` — дати, `/dateanalysis/analysis` —
 * результат. Дефолт, що веде поза цей перелік, не падає — він тихо показує
 * фолбек, тож перевіряється саме адреса. Без визначення блок не має схеми, і
 * редактор адмінки не дає його правити.
 */
describe("«Аналіз дат» — визначення блоків і адреси екранів", () => {
  const DATE_ANALYSIS_SCREENS = [DATE_ANALYSIS_PATH, DATE_ANALYSIS_RESULT_PATH];

  const URL_PROPS: Array<[string, string]> = [
    ["date-input", "basePath"],
    ["compare-setup", "nextUrl"],
    ["date-analysis", "backUrl"],
    ["date-analysis", "targetUrl"],
  ];

  it("кожна адреса за замовчуванням веде на наявний екран", () => {
    for (const [type, prop] of URL_PROPS) {
      const definition = getBlockDefinition(type);
      expect(definition, type).toBeDefined();
      const url = definition?.defaultProps[prop];
      expect(typeof url, `${type}.${prop}`).toBe("string");
      expect(DATE_ANALYSIS_SCREENS, `${type}.${prop} = ${String(url)}`).toContain(url);
    }
  });

  it("кожне поле, яке читає блок, оголошене у схемі", () => {
    for (const [type, prop] of URL_PROPS) {
      const schema = getBlockDefinition(type)?.schema as
        { properties?: Record<string, unknown> } | undefined;
      expect(schema?.properties?.[prop], `${type}.${prop}`).toBeDefined();
    }
  });

  it("ввід дати веде на сторінку аналізу, а не на свій же екран", () => {
    const def = getBlockDefinition("date-input")?.defaultProps ?? {};
    expect(`${String(def.basePath)}/${String(def.targetPath)}`).toBe(DATE_ANALYSIS_RESULT_PATH);
  });
});
