/**
 * Сторож полів вводу: **у жодного поля шрифт не менший за 16px**.
 *
 * Чому це тест, а не коментар. iOS WebKit (і Telegram разом із ним) **сам
 * збільшує сторінку**, коли фокус потрапляє в поле зі шрифтом, меншим за 16px.
 * Збільшена сторінка вже не влазить в екран, і виглядає це як «усе попливло»:
 * заголовок обрізаний, стовпчик вкладок за краєм. Android того не робить
 * **взагалі**, тож дефект видно лише на iPhone — і саме тому він повертався
 * двічі: спершу поля композера були 14px, потім поле хештегів оголосило свої
 * 13px **нижче** за спільну межу й мовчки її перекрило.
 *
 * Правило (`AGENTS.md` §3, `DESIGN_SYSTEM.md` правило 13): кожне поле оголошує
 * шрифт `max(16px, 1em)` — «не менше 16px, але не дрібніше за тему». `1em`
 * у `font-size` — розмір батька, тож бренд із більшим шрифтом (Apple — 17px)
 * зберігає свій розмір. Межа стоїть **у правилі самого контрола**, де її не
 * може перекрити ніщо наступне.
 *
 * Якщо нове правило справді мусить бути дрібним (наприклад, це не поле, а
 * підпис чи рядок-обгортка, який лише зветься «input»), це виняток — і тоді
 * його треба внести в `NON_FIELDS` **у цьому файлі**, а не прибрати перевірку.
 *
 * @module packages/shared/src/styles/fields.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

/** Мінімум, нижче якого iOS збільшує сторінку на фокусі. */
const MIN_FIELD_FONT_PX = 16;

/** Усі стилі продукту: спільний шар і власні файли оболонок. */
const CSS_FILES = [
  "packages/shared/src/styles/components.css",
  "packages/shared/src/styles/app-chrome.css",
  "packages/shared/src/styles/apple.css",
  "packages/shared/src/styles/android.css",
  "packages/shared/src/styles/page-layout.css",
  "packages/shared/src/styles/drawer.css",
  "web-platform-dev/src/index.css",
  "web-admin-dev/src/index.css",
];

/** Винятки: селектор збігається на «поле» за назвою, але полем не є. */
const NON_FIELDS: readonly string[] = [];

/** Вважаємо це полем: у селекторі є назва контрола, у який вводять текст. */
const FIELD_SELECTOR = /\b(input|textarea|select|search)\b/i;

interface Rule {
  file: string;
  selector: string;
  fontSizes: string[];
}

/** Коментарі не код: у них трапляються і селектори, і «13px» як розповідь. */
function read(file: string): string {
  return readFileSync(join(REPO_ROOT, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Значення `--text-*` з `tokens.css` — щоб читати не ім'я токена, а його міру. */
function readTokens(): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [, name, value] of read("packages/shared/src/styles/tokens.css").matchAll(
    /(--[\w-]+)\s*:\s*([^;]+);/g,
  )) {
    tokens.set(name, value.trim());
  }
  return tokens;
}

const TOKENS = readTokens();

/**
 * Мінімальний розмір, який дає це значення, або `null`, якщо прочитати не
 * вдалось (напр. `1em` — це розмір батька, і дрібним його не зробить ніщо
 * зловмисне в цьому файлі).
 */
function minPx(value: string): number | null {
  const clean = value.replace(/!important/g, "").trim();
  // `max(16px, 1em)` — беремо перший аргумент: саме він задає нижню межу.
  const lower = clean.match(/max\(\s*([^,]+),/)?.[1] ?? clean;
  const token = lower.match(/var\(\s*(--[\w-]+)/)?.[1];
  const resolved = (token ? (TOKENS.get(token) ?? "") : lower).trim();
  const px = resolved.match(/(-?[0-9.]+)px/);
  return px ? Number(px[1]) : null;
}

/** Розбір без повноцінного парсера: `селектор { … }`. Вкладені `@media` він обходить сам. */
function readRules(): Rule[] {
  const rules: Rule[] = [];
  for (const file of CSS_FILES) {
    for (const [, selector, body] of read(file).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!FIELD_SELECTOR.test(selector) || NON_FIELDS.some((skip) => selector.includes(skip))) {
        continue;
      }
      const fontSizes = [...body.matchAll(/font-size\s*:\s*([^;]+);/g)].map((m) => m[1].trim());
      if (fontSizes.length > 0) {
        rules.push({ file, selector: selector.replace(/\s+/g, " ").trim(), fontSizes });
      }
    }
  }
  return rules;
}

const fieldRules = readRules();

describe("поля вводу: шрифт не менший за 16px", () => {
  it("знаходить поля в обох шарах — інакше перевірка була б порожньою", () => {
    const selectors = fieldRules.map((rule) => rule.selector);
    // Композер (власні поля) і спільні контроли: якщо парсер зламається,
    // тест провалиться тут, а не тихо пропустить усе.
    expect(selectors.some((s) => s.includes(".wb-composer-tag-input"))).toBe(true);
    expect(selectors.some((s) => s.includes(".wb-textarea"))).toBe(true);
    expect(fieldRules.length).toBeGreaterThan(3);
  });

  it.each(fieldRules)("$file → $selector", ({ file, selector, fontSizes }) => {
    for (const value of fontSizes) {
      const px = minPx(value);
      if (px === null) continue;
      expect(
        px,
        `${file}: ${selector} — шрифт ${value}; iOS сам збільшить сторінку на фокусі`,
      ).toBeGreaterThanOrEqual(MIN_FIELD_FONT_PX);
    }
  });
});
