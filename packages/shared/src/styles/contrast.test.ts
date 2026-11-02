/**
 * Контраст авторських тем за WCAG AA: числа, а не «виглядає нормально».
 *
 * Тем шість, і кожна задає **весь** колірний набір. Тому перевірка читає
 * кожен блок `[data-theme="…"]` (світла тема живе в `tokens.css` під тим самим
 * селектором) і міряє текст на всіх поверхнях, підпис на акценті та видимість
 * підкладок статусів. Нову тему, яка не тримає AA, гейт не пропустить.
 *
 * @module packages/shared/src/styles/contrast.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio, hexToRgb, rgbToHex } from "./color";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

function sheet(file: string): string {
  return readFileSync(join(ROOT, "packages/shared/src/styles", file), "utf8");
}

/** Блок теми з CSS: `[data-theme="id"] { … }` без вкладених правил. */
function themeBlocks(css: string): { id: string; body: string }[] {
  return [...css.matchAll(/\[data-theme="([a-z]+)"\]\s*\{([\s\S]*?)\n\}/g)].map((match) => ({
    id: match[1],
    body: match[2],
  }));
}

/** Значення токена з блоку. Немає — падаємо: ім'я могло змінитись. */
function token(body: string, name: string): string {
  const match = body.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!match) throw new Error(`Токен --${name} не знайдено: перевір його ім'я в CSS.`);
  return match[1];
}

/** Значення як є: `#hex`, `rgba()` — усе, крім посилань на інші токени. */
function rawToken(body: string, name: string): string {
  const value = body.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
  if (!value) throw new Error(`Токен --${name} не знайдено: перевір його ім'я в CSS.`);
  return value;
}

/** Підкладка очима екрана: напівпрозорий шар накладено на поверхню під ним. */
function plateOn(color: string, surface: string): string {
  const rgba = color.match(/rgba?\(([^)]+)\)/);
  const under = hexToRgb(surface);
  if (!rgba || !under) return color;
  const parts = rgba[1]
    .replace("/", " ")
    .split(/[\s,]+/)
    .filter(Boolean);
  const [r, g, b] = parts.slice(0, 3).map(Number);
  const raw = parts[3];
  const alpha =
    raw === undefined ? 1 : Number(raw.replace("%", "")) / (raw.endsWith("%") ? 100 : 1);
  return rgbToHex({
    r: r * alpha + under.r * (1 - alpha),
    g: g * alpha + under.g * (1 - alpha),
    b: b * alpha + under.b * (1 - alpha),
  });
}

/** Наскільки підкладка взагалі видно на поверхні: найбільший зсув каналу. */
function channelDelta(a: string, b: string): number {
  const first = hexToRgb(a);
  const second = hexToRgb(b);
  if (!first || !second) return 0;
  return Math.max(
    Math.abs(first.r - second.r),
    Math.abs(first.g - second.g),
    Math.abs(first.b - second.b),
  );
}

/** Пороги WCAG AA для звичайного тексту й мінімальна видимість підкладки. */
const AA_TEXT = 4.5;
const MIN_PLATE_DELTA = 4;

/** Поверхні, на яких справді стоїть текст (градієнт `--surface` не входить). */
const SURFACES = ["bg-0", "bg-2", "bg-3", "bg-4", "card-bg"] as const;

/** Рівні тексту й статуси: усе це — текст, а не заливка. */
const TEXT_LEVELS = ["text-primary", "text-secondary", "text-muted"] as const;
const STATUSES = ["green", "red", "yellow"] as const;

/** Пари «текст на власній підкладці»: бейдж, чип, вибраний рядок. */
const PLATES = [
  { text: "green", plate: "green-dim" },
  { text: "red", plate: "red-dim" },
  { text: "yellow", plate: "yellow-dim" },
  { text: "accent", plate: "accent-dim" },
] as const;

function expectAa(color: string, surface: string, label: string): void {
  const ratio = contrastRatio(color, surface);
  expect(ratio, `${label} на ${surface}: ${ratio.toFixed(2)} < ${AA_TEXT}`).toBeGreaterThanOrEqual(
    AA_TEXT,
  );
}

function checkTheme(id: string, body: string): void {
  for (const level of TEXT_LEVELS) {
    for (const surface of SURFACES) {
      expectAa(token(body, level), token(body, surface), `${id}: --${level}`);
    }
  }
  for (const status of STATUSES) {
    for (const surface of SURFACES) {
      expectAa(token(body, status), token(body, surface), `${id}: --${status}`);
    }
  }

  // Кнопка: підпис на акцентній плашці — той самий текст, лише на заливці.
  const accent = token(body, "text-inverse");
  const ratio = contrastRatio(accent, token(body, "accent"));
  expect(ratio, `${id}: підпис на акценті ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(AA_TEXT);

  // Підкладка статусу мусить відрізнятись від поверхні, інакше бейджа не видно,
  // і тримати власний текст.
  for (const { text, plate } of PLATES) {
    for (const surface of SURFACES) {
      const under = token(body, surface);
      const painted = plateOn(rawToken(body, plate), under);
      expect(
        channelDelta(painted, under),
        `${id}: --${plate} не видно над --${surface}`,
      ).toBeGreaterThanOrEqual(MIN_PLATE_DELTA);
      expectAa(token(body, text), painted, `${id}: --${text} на --${plate}`);
    }
  }
}

describe("кожна тема тримає AA", () => {
  const light = themeBlocks(sheet("tokens.css"));
  const other = themeBlocks(sheet("themes.css"));

  it("світла тема оголошена тим самим блоком, що й решта", () => {
    expect(light.map((theme) => theme.id)).toEqual(["light"]);
  });

  for (const theme of [...light, ...other]) {
    it(`${theme.id}: текст, статуси й підпис на кнопці`, () => {
      checkTheme(theme.id, theme.body);
    });
  }
});
