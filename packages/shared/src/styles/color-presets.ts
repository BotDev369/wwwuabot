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
 * Друга половина файлу — **сітка кольорів** (`COLOR_CHART`, `COLOR_SHADES`,
 * `HUE_TRACK`). Вона потрібна рівно тому ж: людина не знає кодів, тож колір
 * мусить братися дотиком. Сітка — це та сама гама, лише показана; кодування
 * сюди не потрапляє, бо все виводить `hslToHex()` з `color.ts`.
 *
 * Це **дані**, а не логіка: жодного стану, жодного React.
 *
 * @module packages/shared/src/styles/color-presets
 */

import { hslToHex } from "./color";
import type { UserColors } from "./user-colors.types";

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

/* ── Сітка кольорів ─────────────────────────────────────────────────────────
 *
 * Дванадцять відтінків (кожні 30°) × три світності — це 36 кольорів на тій
 * самій площі, яку займав би один рядок повзунків. Відтінки не «дев'ять і
 * майже», а рівні: нерівний крок читається як зламана сітка.
 *
 * Світності беруться згори вниз (світле → темне), як у будь-якій палітрі:
 * око шукає відтінок у рядку, а не згадує його номер.
 */
const CHART_HUES: readonly number[] = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const CHART_LIGHTNESS: readonly number[] = [74, 56, 38];
/** Насиченість сітки: досить висока, щоб відтінки не сіріли. */
const CHART_SATURATION = 78;

/** Рядки сітки: спершу світлі, останній — темні. */
export const COLOR_CHART: readonly (readonly string[])[] = CHART_LIGHTNESS.map((l) =>
  CHART_HUES.map((h) => hslToHex({ h, s: CHART_SATURATION, l })),
);

/** Смуга від чорного до білого — окремо, бо сірі в сітці не живуть. */
export const COLOR_SHADES: readonly string[] = [0, 14, 28, 42, 56, 70, 84, 100].map((l) =>
  hslToHex({ h: 0, s: 0, l }),
);

/**
 * Доріжка повзунка відтінку — та сама гама, що й у сітки, лише суцільна.
 * Повзунок без неї німий: число 210 не читається, смуга читається.
 */
export const HUE_TRACK = `linear-gradient(to right, ${CHART_HUES.map(
  (h, index) =>
    `${hslToHex({ h, s: 100, l: 50 })} ${Math.round((index / (CHART_HUES.length - 1)) * 100)}%`,
).join(", ")})`;

/** Доріжка «від сірого до повного» для насиченості й «від чорного до білого» для світності. */
export function channelTrack(
  channel: "s" | "l",
  seed: { h: number; s: number; l: number },
): string {
  if (channel === "s") {
    return `linear-gradient(to right, ${hslToHex({ ...seed, s: 0 })}, ${hslToHex({ ...seed, s: 100 })})`;
  }
  return `linear-gradient(to right, ${hslToHex({ ...seed, l: 0 })}, ${hslToHex({ ...seed, l: 50 })}, ${hslToHex({ ...seed, l: 100 })})`;
}

/** Чи вибір збігається з цією палітрою (щоб позначити вибране галочкою). */
export function isPresetActive(preset: ColorPreset, colors: Partial<UserColors>): boolean {
  return colors.bg === preset.bg && colors.text === preset.text && colors.accent === preset.accent;
}
