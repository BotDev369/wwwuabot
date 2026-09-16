/**
 * Сторож мірок кнопки: **кнопки не ростуть потай**.
 *
 * Чому це тест, а не коментар. 16.09.2026 власник сказав: «скрізь завеликі
 * відступи у кнопок, вони багато місця займають». Причина виявилась не в
 * спільному шарі, а в брендах: `apple.css` і `android.css` писали своїм
 * `.wb-btn` `padding: 12px 24px !important` і `min-height: 48px !important`.
 * Через це будь-яке зменшення в `components.css` не діяло **взагалі** — та сама
 * пастка, що була з рамкою поля (правило 13): бренд переписує кирпичик, а не
 * задає його характер.
 *
 * Правило: мірки кнопки — це токени `--btn-pad-y` / `--btn-pad-x`, і задають їх
 * і спільний шар, і бренди. `padding` у `.wb-btn` пише **лише** базове правило,
 * і пише його з цих токенів. Треба щільніші кнопки — міняється токен, а не
 * правило бренду.
 *
 * `packages/shared/src/styles/fields.test.ts` зроблений так само: розбору CSS у
 * тестовому середовищі немає (environment: node, без DOM), тож CSS читається як
 * текст, а кожен сторож лишається самодостатнім.
 *
 * @module packages/shared/src/styles/buttons.test
 */

/// <reference types="node" />

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

/** Усі стилі продукту: спільний шар і власні файли оболонок. */
const CSS_FILES = [
  "packages/shared/src/styles/tokens.css",
  "packages/shared/src/styles/components.css",
  "packages/shared/src/styles/app-chrome.css",
  "packages/shared/src/styles/apple.css",
  "packages/shared/src/styles/android.css",
  "web-platform-dev/src/index.css",
  "web-admin-dev/src/index.css",
];

/**
 * Стелі мірок: вище — це вже та «велика кнопка», яку власник відхилив
 * (було 12×24 при `min-height: 48px`). Міряється в пікселях.
 */
const MAX_PAD_X_PX = 20;
const MAX_PAD_Y_PX = 12;
const MAX_MIN_HEIGHT_PX = 44;

/** Коментарі — не код: у них і «12px», і селектори трапляються як розповідь. */
function read(file: string): string {
  return readFileSync(join(REPO_ROOT, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Значення токенів, щоб `var(--sp-3)` читалось як міра, а не як ім'я. */
const TOKENS = new Map<string, string>();
for (const [, name, value] of read("packages/shared/src/styles/tokens.css").matchAll(
  /(--[\w-]+)\s*:\s*([^;]+);/g,
)) {
  TOKENS.set(name, value.trim());
}

/** `0.75rem` / `8px` / `var(--sp-3)` → пікселі. `null`, якщо прочитати не вдалось. */
function toPx(value: string): number | null {
  const clean = value.replace(/!important/g, "").trim();
  const token = clean.match(/var\(\s*(--[\w-]+)/)?.[1];
  const resolved = (token ? (TOKENS.get(token) ?? "") : clean).trim();
  const px = resolved.match(/^(-?[0-9.]+)px$/);
  if (px) return Number(px[1]);
  const rem = resolved.match(/^(-?[0-9.]+)rem$/);
  return rem ? Number(rem[1]) * 16 : null;
}

interface Rule {
  file: string;
  selector: string;
  body: string;
}

function readRules(): Rule[] {
  const rules: Rule[] = [];
  for (const file of CSS_FILES) {
    for (const [, selector, body] of read(file).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      rules.push({ file, selector: selector.replace(/\s+/g, " ").trim(), body });
    }
  }
  return rules;
}

const RULES = readRules();

/** Сам `.wb-btn`, а не його розміри (`-sm`, `-inline`) чи варіанти кольору. */
const BASE_BUTTON = /\.wb-btn(?![\w-])/;

const baseButtonRules = RULES.filter((rule) => BASE_BUTTON.test(rule.selector));

/** Мірки, оголошені будь-де: і в `:root`, і в бренді. */
const padDeclarations = RULES.flatMap((rule) =>
  [...rule.body.matchAll(/--btn-pad-([xy])\s*:\s*([^;]+);/g)].map((m) => ({
    file: rule.file,
    axis: m[1],
    value: m[2].trim(),
    px: toPx(m[2]),
  })),
);

describe("кнопка: мірки — токен, і жоден бренд їх не переписує", () => {
  it("padding у `.wb-btn` пише лише базове правило — і пише з токенів", () => {
    // Це і є виправлення власника: `padding: 12px 24px !important` у бренді
    // робив будь-яке зменшення в `components.css` невидимим.
    for (const rule of baseButtonRules) {
      const padding = rule.body.match(/padding\s*:\s*([^;]+);/)?.[1].trim();
      if (padding === undefined) continue;
      expect(
        padding,
        `${rule.file}: ${rule.selector} — padding мусить бути var(--btn-pad-y) var(--btn-pad-x)`,
      ).toBe("var(--btn-pad-y) var(--btn-pad-x)");
    }
  });

  it("жоден бренд не піднімає `min-height` кнопки вище стелі", () => {
    // Висота — теж «місце, яке кнопка займає»: Apple тримала 48px !important.
    for (const rule of baseButtonRules) {
      const minHeight = rule.body.match(/min-height\s*:\s*([^;]+);/)?.[1].trim();
      if (minHeight === undefined) continue;
      const px = toPx(minHeight);
      if (px === null) continue;
      expect(
        px,
        `${rule.file}: ${rule.selector} — min-height ${minHeight} вища за ${MAX_MIN_HEIGHT_PX}px`,
      ).toBeLessThanOrEqual(MAX_MIN_HEIGHT_PX);
    }
  });

  it("мірки оголошені в обох шарах — спільному і брендовому", () => {
    // Якщо парсер зламається або токен зникне, тест провалиться тут,
    // а не тихо пропустить усе.
    const filesWithPads = new Set(padDeclarations.map((d) => d.file));
    expect(padDeclarations.some((d) => d.axis === "x")).toBe(true);
    expect(padDeclarations.some((d) => d.axis === "y")).toBe(true);
    expect(filesWithPads.size).toBeGreaterThan(1);
  });

  it.each(padDeclarations)("$file → --btn-pad-$axis: $value", ({ file, axis, value, px }) => {
    if (px === null) return;
    const max = axis === "x" ? MAX_PAD_X_PX : MAX_PAD_Y_PX;
    expect(
      px,
      `${file}: --btn-pad-${axis} = ${value} — більша за стелю ${max}px`,
    ).toBeLessThanOrEqual(max);
  });
});
