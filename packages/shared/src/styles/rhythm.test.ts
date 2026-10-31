/**
 * Ритм відступів — зі шкали `--sp-*`, а не власним числом екрана.
 *
 * Поки `padding` писав кожен файл своїм числом, той самий блок мав 10px в
 * одному місці й 12px у сусідньому — і сторінки читались як різні продукти.
 * Сторож: поза `tokens.css` відступ бере токен. `calc()` і `clamp()`
 * лишаються — вони складають токен із safe-area, а не вигадують мірку.
 *
 * @module packages/shared/src/styles/rhythm.test
 */

/// <reference types="node" />

import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const FILES = [
  ...readdirSync(new URL(".", import.meta.url))
    .filter((name) => name.endsWith(".css"))
    .map((name) => name),
  ...readdirSync(new URL("./admin/", import.meta.url))
    .filter((name) => name.endsWith(".css"))
    .map((name) => `admin/${name}`),
];

/** Власник шкали: тільки тут число має право бути числом. */
const OWNER = "tokens.css";

/** Дозволене: скидання, посилання на токен і рольові обчислення. */
const ALLOWED = /padding[a-z-]*:\s*(?:0[\s;]|var\(--|calc\(|clamp\(|inherit|unset|revert)/;

describe("відступи — зі шкали, а не власним числом", () => {
  it("жоден `padding` поза tokens.css не пише пікселі", () => {
    const offenders: string[] = [];

    for (const file of FILES) {
      if (file === OWNER) continue;
      const css = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
      for (const match of css.matchAll(/padding[a-z-]*:\s*[^;]+;/g)) {
        if (ALLOWED.test(match[0])) continue;
        offenders.push(`${file}: ${match[0].replace(/\s+/g, " ")}`);
      }
    }

    expect(offenders, "відступ — крок `--sp-*`, а не власне число").toEqual([]);
  });
});
