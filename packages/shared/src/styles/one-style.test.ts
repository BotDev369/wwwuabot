/**
 * Стиль продукту один: другого шару стилів немає.
 *
 * Шар жив як `android.css` плюс `data-brand` на `<html>`, і кожну мірку можна
 * було написати двічі. Сторож: ні атрибута, ні файлу-шару, ні його імпорту.
 *
 * @module packages/shared/src/styles/one-style.test
 */

/// <reference types="node" />

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

/** Що саме шукаємо: атрибут вибору стилю і файл-шар, який він вмикав. */
const SECOND_LAYER = /data-brand|(?:android|apple|brand)\.css/;

const SKIP = /^(?:node_modules|dist|coverage|\.git|\.freebuff|\.wrangler)$/;
const SOURCE = /\.(?:css|ts|tsx|js|mjs|html|md|json|sql|toml)$/;

/** Цей файл називає атрибут навмисно — він і є сторожем. */
const GUARD = "packages/shared/src/styles/one-style.test.ts";

const DIRS = [
  "packages",
  "web-platform-dev",
  "web-admin-dev",
  "bot-dev",
  "api-dev",
  "docs",
  "scripts",
];

/** Усі вихідні файли репозиторію, крім каркасів, білдів і цього сторожа. */
function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(join(REPO_ROOT, dir))) {
    if (SKIP.test(name)) continue;
    const rel = join(dir, name);
    if (statSync(join(REPO_ROOT, rel)).isDirectory()) {
      sources(rel, out);
      continue;
    }
    if (SOURCE.test(name) && !rel.includes("package-lock")) out.push(rel);
  }
  return out;
}

const FILES = DIRS.flatMap((dir) => sources(dir)).filter((file) => file !== GUARD);

describe("другого шару стилів немає", () => {
  it("атрибута вибору стилю й файлу-шару не згадує ні код, ні розмітка, ні документ", () => {
    // Правило існує тому, що шар повертається одним рядком: `android.css` у
    // `@import` і `data-brand` в `initTheme` — і мірка знову має дві правди.
    const offenders = FILES.filter((file) =>
      SECOND_LAYER.test(readFileSync(join(REPO_ROOT, file), "utf8")),
    );
    expect(offenders, "стиль один — вибирати нема чого").toEqual([]);
  });

  it("у пакеті стилів немає файлу-шару", () => {
    const files = readdirSync(new URL(".", import.meta.url));
    expect(files.filter((name) => /^(?:android|apple|brand)\.css$/.test(name))).toEqual([]);
  });

  it("кожна тема задає весь колірний набір, а не половину", () => {
    // Тема, яка перевизначила три кольори, а решту лишила від світлої,
    // показує світлу картку під темним текстом — саме так екран «Акаунт»
    // ставав нечитабельним. Ролі перелічені явно: мірки (відступи, кеглі,
    // радіуси) тема не повторює, а кожен колір мусить задати сама.
    const COLOR_ROLES = [
      "bg-home",
      "bg-0",
      "bg-1",
      "bg-2",
      "bg-3",
      "bg-4",
      "border",
      "border-hover",
      "border-subtle",
      "text-primary",
      "text-secondary",
      "text-muted",
      "text-inverse",
      "text-on-scrim",
      "accent",
      "accent-dim",
      "accent-hover",
      "accent-soft",
      "data-1",
      "data-2",
      "data-3",
      "data-4",
      "data-5",
      "data-6",
      "tint-1",
      "tint-2",
      "tint-3",
      "green",
      "green-dim",
      "red",
      "red-dim",
      "yellow",
      "yellow-dim",
      "surface",
      "surface-hover",
      "surface-active",
      "surface-overlay",
      "surface-modal",
      "selection-bg",
      "hairline",
      "card-bg",
      "card-border",
      "sidebar-bg",
      "sidebar-shadow",
      "field-bg",
      "field-bg-raised",
      "switch-knob",
      "field-ring",
      "chrome-header-bg",
      "chrome-bottom-bg",
      "bg-page",
      "modal-scrim",
    ] as const;

    const light = readFileSync(join(REPO_ROOT, "packages/shared/src/styles/tokens.css"), "utf8");
    for (const role of COLOR_ROLES) {
      expect(light, `світла тема: --${role}`).toMatch(new RegExp(`--${role}\\s*:`));
    }

    const css = readFileSync(join(REPO_ROOT, "packages/shared/src/styles/themes.css"), "utf8");
    const blocks = [...css.matchAll(/\[data-theme="([a-z]+)"\]\s*\{([\s\S]*?)\n\}/g)];
    expect(blocks.map((block) => block[1])).toEqual(["dark", "paper", "ocean", "forest", "plum"]);

    for (const [, id, body] of blocks) {
      const declared = new Set(
        [...body.matchAll(/^\s*--([a-z0-9-]+)\s*:/gm)].map((match) => match[1]),
      );
      const missing = COLOR_ROLES.filter((name) => !declared.has(name));
      expect(missing, `тема «${id}» лишила роль від світлої теми`).toEqual([]);
    }
  });

  it("мірки оголошені РАЗ — у `tokens.css`", () => {
    // Друга копія числа — це друга правда: кнопка, поле й картка мірялись би
    // по-різному залежно від того, який файл переміг у каскаді.
    // Стилі — лише з однієї папки: оболонки свого CSS більше не мають
    // (`npm run check:css` не пропустить правило поза нею).
    const sheets = sources("packages/shared/src/styles").filter((file) => file.endsWith(".css"));

    for (const token of [
      "--card-radius",
      "--btn-pad-x",
      "--field-pad-x",
      "--sp-4",
      "--radius-md",
    ]) {
      const owners = sheets.filter((file) =>
        new RegExp(`^\\s*${token}\\s*:`, "m").test(readFileSync(join(REPO_ROOT, file), "utf8")),
      );
      expect(owners, `${token} мусить мати одного власника`).toEqual([
        "packages/shared/src/styles/tokens.css",
      ]);
    }
  });
});
