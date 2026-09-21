/**
 * Вкладки готових тем — склад, порядок і адреса.
 *
 * **Тема — одне слово на всі три джерела.** Готові трійки, свої теми й теми з
 * Простору лежать поряд, бо людина шукає **тему**, а не «мою» чи «публічну»:
 * поділ на екрани змушував би її щоразу вгадувати, де шукати.
 *
 * **«Платформа» перша.** Вона має що показати завжди — своїх тем може ще не
 * бути, а порожня перша вкладка читається як поламаний екран.
 *
 * **Вкладка є в адресі** (`/profile/theme/presets?tab=mine`): у неї веде «До
 * готових тем» із налаштувань, і людина має потрапити саме у свої, а не
 * шукати їх очима. Адреса — це **вхід**: далі вкладкою керує стан.
 *
 * @module web-platform-dev/src/pages/themes/presets-tabs
 */

import { themeSectionPath } from "./theme-sections";

export type PresetTab = "platform" | "mine" | "space";

export interface PresetTabOption {
  key: PresetTab;
  label: string;
}

export const PRESET_TABS: readonly PresetTabOption[] = [
  { key: "platform", label: "Платформа" },
  { key: "mine", label: "Мої" },
  { key: "space", label: "З простору" },
];

export const DEFAULT_PRESET_TAB: PresetTab = "platform";

/** Параметр адреси: `?tab=mine` — з якої вкладки почати. */
export const PRESET_TAB_PARAM = "tab";

/** Вкладка з адреси. Невідомий ключ дає типову — зайвої порожнечі тут немає. */
export function readPresetTab(value: string | null): PresetTab {
  return PRESET_TABS.some((tab) => tab.key === value) ? (value as PresetTab) : DEFAULT_PRESET_TAB;
}

/** Адреса вкладки. Типова адреси не потребує: вона й є самим екраном. */
export function presetTabPath(tab: PresetTab): string {
  const base = themeSectionPath("presets");
  return tab === DEFAULT_PRESET_TAB ? base : `${base}?${PRESET_TAB_PARAM}=${tab}`;
}
