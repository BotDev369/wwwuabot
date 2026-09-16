/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COLOR PRESETS — готові трійки кольорів
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Палітра обмежена, і це навмисно: повзунки дають **будь-який** колір, але
 * почати з нуля щоразу — робота, а не вибір. Тому тут готові трійки, а вже
 * з них людина рухає повзунки, якщо хочеться свого.
 *
 * Порядок — від чорного до білого, як просив власник: спершу нічні, потім
 * земляні, потім світлі. Кожна трійка перевірена очима на контраст «фон ↔
 * основний» — це те, що інакше виглядало як «текст злився з тлом».
 *
 * Це **дані**, а не логіка: жодного стану, жодного React.
 *
 * @module packages/shared/src/styles/color-presets
 */

import type { UserColors } from "./user-colors";

export interface ColorPreset extends UserColors {
  id: string;
  labelUk: string;
}

export const COLOR_PRESETS: readonly ColorPreset[] = [
  { id: "night", labelUk: "Ніч", bg: "#0b0b0f", text: "#f2f3f7", accent: "#7aa2ff" },
  { id: "charcoal", labelUk: "Вугілля", bg: "#14161a", text: "#e8eaee", accent: "#ff8a5c" },
  { id: "graphite", labelUk: "Графіт", bg: "#1c1c1e", text: "#f5f5f7", accent: "#30d158" },
  { id: "dusk", labelUk: "Сутінки", bg: "#1b1b2f", text: "#e6e6f0", accent: "#c084fc" },
  { id: "ocean", labelUk: "Океан", bg: "#0d1b2a", text: "#e0e1dd", accent: "#48cae4" },
  { id: "forest", labelUk: "Ліс", bg: "#14231a", text: "#e6f0e8", accent: "#a3e635" },
  { id: "wine", labelUk: "Вино", bg: "#2a1119", text: "#f7e9ec", accent: "#f472b6" },
  { id: "cream", labelUk: "Крем", bg: "#f6f1e7", text: "#2b2620", accent: "#b45309" },
  { id: "sand", labelUk: "Пісок", bg: "#f3ece3", text: "#3a3229", accent: "#0f766e" },
  { id: "lavender", labelUk: "Лаванда", bg: "#f3f0ff", text: "#2b2350", accent: "#6d28d9" },
  { id: "paper", labelUk: "Папір", bg: "#ffffff", text: "#17181c", accent: "#2563eb" },
  { id: "mono", labelUk: "Моно", bg: "#f0f2f5", text: "#111827", accent: "#1c1b1f" },
];

/** Чи вибір збігається з цією палітрою (щоб позначити вибране галочкою). */
export function isPresetActive(preset: ColorPreset, colors: Partial<UserColors>): boolean {
  return colors.bg === preset.bg && colors.text === preset.text && colors.accent === preset.accent;
}
