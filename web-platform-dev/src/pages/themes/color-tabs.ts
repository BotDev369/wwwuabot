/**
 * Вкладки пункту «Кольори теми» — склад і порядок.
 *
 * **Три джерела, одне слово.** Людина шукає колір, а не «мою» чи «публічну»
 * тему, тож джерела лежать поряд в одному пункті, а не на трьох екранах.
 *
 * **Шаблони перші**: вони є завжди, а свої кольори й публічні з'являються з
 * часом — порожня перша вкладка читалася б як поламаний пункт.
 *
 * @module web-platform-dev/src/pages/themes/color-tabs
 */

import type { TabOption } from "@wwwuabot/ui/tabs";

export type ColorTab = "templates" | "mine" | "public";

export const COLOR_TABS: readonly TabOption<ColorTab>[] = [
  { key: "templates", label: "Шаблони" },
  { key: "mine", label: "Мої кольори" },
  { key: "public", label: "Публічні кольори" },
];

export const DEFAULT_COLOR_TAB: ColorTab = "templates";
