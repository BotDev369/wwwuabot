/**
 * Вкладки готових тем — склад і адреса.
 *
 * Дві речі, які ламаються мовчки: **порядок** (порожня перша вкладка зустрічає
 * людину порожнім екраном) і **те, що сторінка рендерить усі три** (вкладка,
 * під якою нічого немає, — це обіцянка, а не екран).
 *
 * @module web-platform-dev/src/pages/themes/presets-tabs.test
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRESET_TAB,
  PRESET_TABS,
  PRESET_TAB_PARAM,
  presetTabPath,
  readPresetTab,
} from "./presets-tabs";

/** Корінь оболонки — від цього файлу, а не від робочої теки запуску. */
const WORKSPACE_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

describe("джерела готових тем", () => {
  it("їх три, і перша — платформа", () => {
    // Своїх тем може ще не бути, а порожня перша вкладка читається як поламаний
    // екран; у платформи теми є завжди.
    expect(PRESET_TABS.map((tab) => tab.label)).toEqual(["Платформа", "Мої", "З простору"]);
    expect(PRESET_TABS[0].key).toBe(DEFAULT_PRESET_TAB);
  });

  it("кожну вкладку сторінка справді рендерить", () => {
    const page = readFileSync(
      join(WORKSPACE_ROOT, "src", "pages", "themes", "ThemePresetsPage.tsx"),
      "utf8",
    );
    for (const tab of PRESET_TABS) {
      expect(page, tab.key).toContain(`tab === "${tab.key}"`);
    }
  });
});

describe("вкладка в адресі", () => {
  it("невідомий ключ (і порожньо) дає типову", () => {
    expect(readPresetTab("mine")).toBe("mine");
    expect(readPresetTab(null)).toBe(DEFAULT_PRESET_TAB);
    expect(readPresetTab("немає-такої")).toBe(DEFAULT_PRESET_TAB);
  });

  it("типова вкладка адреси не потребує", () => {
    // Зайвий параметр робив би два посилання на один і той самий екран.
    expect(presetTabPath(DEFAULT_PRESET_TAB)).toBe("/profile/theme/presets");
    expect(presetTabPath("mine")).toBe(`/profile/theme/presets?${PRESET_TAB_PARAM}=mine`);
  });
});
