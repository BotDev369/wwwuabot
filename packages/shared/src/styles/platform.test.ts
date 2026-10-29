/**
 * Одна розмітка — різні ОС: різницю прибираємо тут, а не на кожному екрані.
 *
 * Дотик не «наводить» (`:hover` лише під `@media (hover: hover)`), Android не
 * малює свою сіру пляму на тапі, Firefox бачить темну смугу прокрутки, нативні
 * контроли знають про `color-scheme`, а Safari не робить із ціни дзвінок.
 *
 * @module packages/shared/src/styles/platform.test
 */

/// <reference types="node" />

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

const SHEETS = [
  ...readdirSync(new URL(".", import.meta.url))
    .filter((name) => name.endsWith(".css"))
    .map((name) => `packages/shared/src/styles/${name}`),
  "web-platform-dev/src/index.css",
];

function read(file: string): string {
  return readFileSync(join(REPO_ROOT, file), "utf8");
}

/** Текст без коментарів: `:hover` у поясненні — не правило. */
function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** Прибирає блоки `@media (hover: hover)` разом із вмістом. */
function withoutHoverMedia(source: string): string {
  const key = "@media (hover: hover)";
  let out = "";
  let i = 0;
  while (i < source.length) {
    if (!source.startsWith(key, i)) {
      out += source[i];
      i += 1;
      continue;
    }
    let depth = 0;
    let k = source.indexOf("{", i);
    while (k < source.length) {
      if (source[k] === "{") depth += 1;
      else if (source[k] === "}") {
        depth -= 1;
        if (depth === 0) {
          k += 1;
          break;
        }
      }
      k += 1;
    }
    i = k;
  }
  return out;
}

describe("поведінка під пристрій", () => {
  it("`:hover` живе лише під `@media (hover: hover)`", () => {
    // На тачі `:hover` лишається на останньому торкнутому елементі: пункт,
    // рядок і картка «залипали» підсвіченими після одного тапу.
    const offenders = SHEETS.filter((file) =>
      withoutHoverMedia(code(read(file))).includes(":hover"),
    );
    expect(offenders, "дотик отримує `:active`, а `:hover` — лише миша").toEqual([]);
  });

  it("тап, смуга прокрутки й overscroll — однакові в усіх браузерах", () => {
    const reset = read("packages/shared/src/styles/reset.css");
    for (const line of [
      "-webkit-tap-highlight-color: transparent",
      "touch-action: manipulation",
      "scrollbar-color: var(--text-muted) transparent",
      "scrollbar-width: thin",
      "overscroll-behavior-y: none",
    ]) {
      expect(reset, line).toContain(line);
    }
    // Прокрутка всередині вікна не передається сторінці за ним: правило живе
    // у самого кирпичика (`components.css`), а не в чужому файлі.
    expect(read("packages/shared/src/styles/components.css")).toContain(
      "overscroll-behavior: contain",
    );
  });

  it("нативні контроли знають, яка схема ввімкнена", () => {
    // Без цього `<select>`, календар і смуги прокрутки малює ОС у своїй схемі.
    expect(read("packages/shared/src/styles/tokens.css")).toContain("color-scheme: light");
    expect(read("packages/shared/src/styles/themes.css")).toContain("color-scheme: dark");
    expect(read("packages/shared/src/styles/user-colors.css")).toContain("color-scheme: dark");
  });

  it("обидві оболонки кажуть браузеру про виріз, колір смуги й числа", () => {
    for (const file of ["web-platform-dev/index.html", "web-admin-dev/index.html"]) {
      const html = read(file);
      expect(html, file).toContain("viewport-fit=cover");
      expect(html, file).toContain('name="theme-color"');
      expect(html, file).toContain('name="format-detection" content="telephone=no"');
    }
  });
});
