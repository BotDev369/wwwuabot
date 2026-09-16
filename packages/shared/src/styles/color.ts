/**
 * ═══════════════════════════════════════════════════════════════════════════
 * COLOR — чиста арифметика кольору
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Мішати кольори в самому CSS уміє `color-mix()`, тож сюди потрапляє лише те,
 * чого CSS не вміє: **вибір** між двома варіантами (який підпис читається на
 * акцентній плашці) і **перевірка** (чи не злився текст із фоном).
 *
 * Це чисті функції без DOM: ними користуються і браузер, і тести, і жодна
 * з них не читає `window`. Помилка тут виглядає не як зламаний код, а як
 * «щось нечитабельне на екрані» — саме тому вони під тестами
 * (`user-colors.test.ts`).
 *
 * @module packages/shared/src/styles/color
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface Hsl {
  /** 0-360 */
  h: number;
  /** 0-100 */
  s: number;
  /** 0-100 */
  l: number;
}

/** `#rgb` або `#rrggbb` (регістр не має значення). */
export const HEX_RE = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Чи це колір, який ми вміємо читати (`#abc`, `#aabbcc`). */
export function isHexColor(value: string): boolean {
  return HEX_RE.test(value.trim());
}

/**
 * Будь-яке зрозуміле подання → `#rrggbb` у нижньому регістрі.
 * `null` — коли це не колір: тоді виклик сам вирішує, що робити (у гейті
 * поля — показати «порожньо», а не залити його чорним).
 */
export function normalizeHex(value: string): string | null {
  const raw = value.trim().toLowerCase();
  if (!HEX_RE.test(raw)) return null;
  if (raw.length === 7) return raw;
  const [, r, g, b] = raw;
  return `#${r}${r}${g}${g}${b}${b}`;
}

export function hexToRgb(value: string): Rgb | null {
  const hex = normalizeHex(value);
  if (!hex) return null;
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, "0");
  return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/** Відносна яскравість за WCAG (0 — чорний, 1 — білий). */
export function relativeLuminance(value: string): number {
  const rgb = hexToRgb(value);
  if (!rgb) return 0;
  const channel = (raw: number) => {
    const c = raw / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

/** Контраст двох кольорів за WCAG: 1 (невидимо) … 21 (чорне на білому). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Темний колір — той, на якому слід писати світлим. */
export function isDarkColor(value: string): boolean {
  return relativeLuminance(value) < 0.5;
}

/** HSL → `#rrggbb`. Використовують повзунки: людина думає відтінком, а не каналами. */
export function hslToHex({ h, s, l }: Hsl): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const light = Math.max(0, Math.min(100, l)) / 100;

  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const sector = hue / 60;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  const base: Rgb =
    sector < 1
      ? { r: chroma, g: x, b: 0 }
      : sector < 2
        ? { r: x, g: chroma, b: 0 }
        : sector < 3
          ? { r: 0, g: chroma, b: x }
          : sector < 4
            ? { r: 0, g: x, b: chroma }
            : sector < 5
              ? { r: x, g: 0, b: chroma }
              : { r: chroma, g: 0, b: x };
  const m = light - chroma / 2;

  return rgbToHex({ r: (base.r + m) * 255, g: (base.g + m) * 255, b: (base.b + m) * 255 });
}

/** `#rrggbb` → HSL. `null`, коли це не колір. */
export function hexToHsl(value: string): Hsl | null {
  const rgb = hexToRgb(value);
  if (!rgb) return null;

  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const light = (max + min) / 2;

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  if (hue < 0) hue += 360;

  const sat = delta === 0 ? 0 : delta / (1 - Math.abs(2 * light - 1));
  return { h: Math.round(hue), s: Math.round(sat * 100), l: Math.round(light * 100) };
}
