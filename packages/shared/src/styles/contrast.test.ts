/**
 * Контраст за WCAG AA: числа, а не «виглядає нормально».
 * Схеми читаються з `tokens.css` / `themes.css` (правка токена не проходить повз),
 * палітра людини — з `readable.ts`, обіцянка шаблонів — з `color-presets.ts`.
 * Пороги й правило — `docs/TOKENS.md`.
 *
 * @module packages/shared/src/styles/contrast.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./color";
import { COLOR_PRESETS } from "./color-presets";
import { AA_TEXT, AAA_TEXT, dimmestReadable, readablePalette, surfaceSteps } from "./readable";
import { onAccentColor } from "./user-colors";
import type { UserColors } from "./user-colors.types";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

function sheet(file: string): string {
  return readFileSync(join(ROOT, "packages/shared/src/styles", file), "utf8");
}

/** Значення токена з CSS схеми. Немає значення — падаємо: ім'я могло змінитись. */
function token(css: string, name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!match) throw new Error(`Токен --${name} не знайдено: перевір його ім'я в CSS.`);
  return match[1];
}

/** Поверхні, на яких справді стоїть текст (градієнт `--surface` не входить). */
const SURFACES = ["bg-0", "bg-2", "bg-3", "bg-4", "card-bg"] as const;

/** Рівні тексту й статуси: усе це — текст, а не заливка. */
const TEXT_LEVELS = ["text-primary", "text-secondary", "text-muted"] as const;
const STATUSES = ["green", "red", "yellow"] as const;

/** Найгірший контраст кольору з поверхнями: саме він і вирішує. */
function worst(color: string, surfaces: readonly string[]): number {
  return Math.min(...surfaces.map((surface) => contrastRatio(color, surface)));
}

function expectAa(color: string, surfaces: readonly string[], label: string): void {
  for (const surface of surfaces) {
    const ratio = contrastRatio(color, surface);
    expect(
      ratio,
      `${label} на ${surface}: ${ratio.toFixed(2)} < ${AA_TEXT}`,
    ).toBeGreaterThanOrEqual(AA_TEXT);
  }
}

function checkScheme(css: string, name: string): void {
  const surfaces = SURFACES.map((surface) => token(css, surface));

  for (const level of TEXT_LEVELS) {
    expectAa(token(css, level), surfaces, `${name}: --${level}`);
  }
  for (const status of STATUSES) {
    expectAa(token(css, status), surfaces, `${name}: --${status}`);
  }

  // Кнопка: підпис на акцентній плашці — той самий текст, лише на заливці.
  const ratio = contrastRatio(token(css, "text-inverse"), token(css, "accent"));
  expect(ratio, `${name}: підпис на акценті ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(AA_TEXT);
}

describe("схеми читаються за AA", () => {
  it("світла: текст, статуси й підпис на кнопці", () => {
    checkScheme(sheet("tokens.css"), "світла");
  });

  it("темна: текст, статуси й підпис на кнопці", () => {
    checkScheme(sheet("themes.css"), "темна");
  });

  it("приглушений текст тримається й на натиснутій поверхні", () => {
    // `--bg-4` — найдальша від фону сходинка, і саме на ній сірий зникав першим.
    for (const file of ["tokens.css", "themes.css"]) {
      const css = sheet(file);
      const ratio = contrastRatio(token(css, "text-muted"), token(css, "bg-4"));
      expect(ratio, `${file}: --text-muted на --bg-4 ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(
        AA_TEXT,
      );
    }
  });
});

/** Крайні палітри, які людина справді може зібрати повзунками. */
const EXTREMES: readonly { id: string; colors: UserColors }[] = [
  { id: "чорне на білому", colors: { bg: "#ffffff", text: "#000000", accent: "#1d4ed8" } },
  { id: "біле на чорному", colors: { bg: "#000000", text: "#ffffff", accent: "#7aa2ff" } },
  { id: "кремове", colors: { bg: "#fff8e1", text: "#3b2f1a", accent: "#a84700" } },
  { id: "нічне синє", colors: { bg: "#0a1929", text: "#e7eef7", accent: "#48cae4" } },
];

function expectPalette(colors: UserColors, label: string): void {
  const surfaces = surfaceSteps(colors);
  const palette = readablePalette(colors);

  for (const [level, color] of Object.entries(palette)) {
    const ratio = worst(color, surfaces);
    expect(ratio, `${label}: ${level} ${color} на найгіршій поверхні`).toBeGreaterThanOrEqual(
      AA_TEXT,
    );
  }

  // Рівні не злипаються: підказка мусить бути слабшою за другий рівень.
  expect(
    worst(palette.secondary, surfaces),
    `${label}: другий рівень не сильніший за підказку`,
  ).toBeGreaterThan(worst(palette.muted, surfaces));
}

describe("палітра людини тримає AA на будь-яких трьох кольорах", () => {
  for (const item of EXTREMES) {
    it(`${item.id}: текст, статуси й кнопка`, () => {
      expectPalette(item.colors, item.id);
      expect(contrastRatio(item.colors.text, item.colors.bg)).toBeGreaterThanOrEqual(AA_TEXT);
      expectPalette(item.colors, item.id);

      const onAccent = onAccentColor(item.colors);
      expect(contrastRatio(onAccent, item.colors.accent)).toBeGreaterThanOrEqual(AA_TEXT);
      // Акцент — ще й колір посилань, тобто текст на фоні.
      expect(contrastRatio(item.colors.accent, item.colors.bg)).toBeGreaterThanOrEqual(AA_TEXT);
    });
  }

  it("коли фон і текст однакові, більше читабельності немає — і код цього не обіцяє", () => {
    // Мідний фон із майже тим самим текстом: AA недосяжний, тож відтінок
    // лишається основним кольором, а не вигаданим «сірим на сірому».
    const colors: UserColors = { bg: "#777777", text: "#888888", accent: "#ffffff" };
    expect(dimmestReadable(colors, AA_TEXT)).toBe(colors.text);
    expect(readablePalette(colors).muted).toBe(colors.text);
  });

  it("другий рівень цілиться в AAA, коли фон це дозволяє", () => {
    const colors: UserColors = { bg: "#0b0b0f", text: "#f2f3f7", accent: "#7aa2ff" };
    const surfaces = surfaceSteps(colors);
    expect(worst(readablePalette(colors).secondary, surfaces)).toBeGreaterThanOrEqual(AAA_TEXT);
  });
});

describe("шаблони кольорів перевірені числом, а не словом", () => {
  for (const preset of COLOR_PRESETS) {
    it(`«${preset.labelUk}»: текст, підказка, статуси й кнопка`, () => {
      expect(
        contrastRatio(preset.text, preset.bg),
        `${preset.id}: основний текст`,
      ).toBeGreaterThanOrEqual(AA_TEXT);
      expectPalette(preset, preset.id);

      const onAccent = onAccentColor(preset);
      expect(
        contrastRatio(onAccent, preset.accent),
        `${preset.id}: підпис на акцентній кнопці`,
      ).toBeGreaterThanOrEqual(AA_TEXT);
      expect(
        contrastRatio(preset.accent, preset.bg),
        `${preset.id}: акцент як колір посилання`,
      ).toBeGreaterThanOrEqual(AA_TEXT);
    });
  }
});
