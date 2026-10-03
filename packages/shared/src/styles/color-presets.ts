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
  /**
   * Шрифт шаблону. Усі шаблони несуть **шрифт проєкту** (порожній id = «як у
   * стилі»), тож картка показує його так само, як своя тема, і застосування
   * шаблону не тягне за собою чужий шрифт.
   */
  font: string;
}

/** Шрифт усіх шаблонів: типографіка самого проєкту, а не вибір людини. */
export const PRESET_FONT = "";

/** Готовий шаблон: кольори + шрифт проєкту (`PRESET_FONT`). */
function preset(
  id: string,
  labelUk: string,
  bg: string,
  text: string,
  accent: string,
): ColorPreset {
  return { id, labelUk, bg, text, accent, font: PRESET_FONT };
}

export const COLOR_PRESETS: readonly ColorPreset[] = [
  preset("night", "Ніч", "#0b0b0f", "#f2f3f7", "#7aa2ff"),
  preset("charcoal", "Вугілля", "#14161a", "#e8eaee", "#ff8a5c"),
  preset("graphite", "Графіт", "#1c1c1e", "#f5f5f7", "#30d158"),
  preset("dusk", "Сутінки", "#1b1b2f", "#e6e6f0", "#c084fc"),
  preset("ocean", "Океан", "#0d1b2a", "#e0e1dd", "#48cae4"),
  preset("forest", "Ліс", "#14231a", "#e6f0e8", "#a3e635"),
  preset("wine", "Вино", "#2a1119", "#f7e9ec", "#f472b6"),
  preset("cream", "Крем", "#f6f1e7", "#2b2620", "#b45309"),
  preset("sand", "Пісок", "#f3ece3", "#3a3229", "#0f766e"),
  preset("lavender", "Лаванда", "#f3f0ff", "#2b2350", "#6d28d9"),
  preset("paper", "Папір", "#ffffff", "#17181c", "#2563eb"),
  preset("mono", "Моно", "#f0f2f5", "#111827", "#1c1b1f"),
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
