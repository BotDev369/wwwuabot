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

/** Оголошені токени файлу: перше значення кожного імені. */
function tokens(file: string): Record<string, string> {
  const css = readFileSync(join(REPO_ROOT, file), "utf8");
  const out: Record<string, string> = {};
  for (const match of css.matchAll(/^\s*--([a-z0-9-]+)\s*:\s*([^;]+);/gm)) {
    out[match[1]] ??= match[2].trim().replace(/\s+/g, " ");
  }
  return out;
}

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

  it("палітра людини задає кожен колір, у якому схеми розходяться", () => {
    // Токен, про який світла й темна схема кажуть різне, — це колір світлоти.
    // Якщо його не задає палітра, він приходить зі СХЕМИ, і темна палітра в
    // збереженій світлій схемі отримує білу картку під світлим текстом: саме
    // так екран «Акаунт» ставав нечитабельним. Тіні — не колір, а світло:
    // їх глибину схема задає навмисно.
    const SCHEME_OWNED = /^(?:shadow-|elevation-)|-shadow$/;

    const light = tokens("packages/shared/src/styles/tokens.css");
    const dark = tokens("packages/shared/src/styles/themes.css");
    const palette = tokens("packages/shared/src/styles/user-colors.css");

    const missing = Object.keys(dark)
      .filter((name) => light[name] !== undefined && light[name] !== dark[name])
      .filter((name) => !SCHEME_OWNED.test(name))
      .filter((name) => palette[name] === undefined);

    expect(missing, "колір мусить мати одну правду — палітру, а не схему").toEqual([]);
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
