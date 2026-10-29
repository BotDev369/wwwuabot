/**
 * Кегль і кути — лише зі шкали токенів, а не власним числом екрана.
 *
 * Поки в CSS жили `font-size: 9px`, `10px`, `12.5px`, `15px` і `border-radius:
 * 6px`, той самий підпис і та сама картка на двох екранах були різними. Сторож:
 * `font-size` і `border-radius` поза `tokens.css` беруть `var(--…)`.
 *
 * @module packages/shared/src/styles/type-scale.test
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
  "web-admin-dev/src/index.css",
  "web-admin-dev/src/monitoring.css",
];

/** Власники значень: шкала оголошена там, і тільки там їй місце. */
const OWNERS = ["packages/shared/src/styles/tokens.css", "packages/shared/src/styles/themes.css"];

/** Дозволене поза токенами: посилання, скидання, 0, межа полів і рольові clamp. */
const ALLOWED = /font-size:\s*(?:var\(--|inherit|0;|max\(|clamp\()/;

function read(file: string): string {
  return readFileSync(join(REPO_ROOT, file), "utf8");
}

describe("шкала кеглів", () => {
  it("кожен `font-size` бере токен — сирих чисел у стилях немає", () => {
    const offenders: string[] = [];
    for (const file of SHEETS) {
      if (OWNERS.includes(file)) continue;
      for (const match of read(file).matchAll(/font-size:\s*[^;]+;/g)) {
        if (ALLOWED.test(match[0])) continue;
        offenders.push(`${file}: ${match[0]}`);
      }
    }
    expect(offenders, "кегль — зі шкали `--text-*`, а не власне число").toEqual([]);
  });

  it("шкала оголошена повністю й один раз", () => {
    const tokens = read(OWNERS[0]);
    for (const step of ["xs", "sm", "base", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl"]) {
      expect(tokens.match(new RegExp(`--text-${step}:`, "g"))?.length, step).toBe(1);
    }
  });

  it("кути — теж кроки шкали, а не власне число", () => {
    const allowed = /border-radius:\s*(?:var\(--|0;|0\s|50%;|100%;|inherit)/;
    const offenders: string[] = [];
    for (const file of SHEETS) {
      if (OWNERS.includes(file)) continue;
      for (const match of read(file).matchAll(/border-radius:\s*[^;]+;/g)) {
        if (allowed.test(match[0])) continue;
        offenders.push(`${file}: ${match[0]}`);
      }
    }
    expect(offenders, "кут — зі шкали `--radius-*`").toEqual([]);
  });

  it("фокус і рух — наскрізні, а не в окремому екрані", () => {
    const reset = read("packages/shared/src/styles/reset.css");
    expect(reset).toContain("button:focus-visible");
    expect(reset).toContain("outline: var(--focus-ring-width) solid var(--focus-ring-color)");
    expect(reset).toContain("@media (prefers-reduced-motion: reduce)");
    // Токени самого кільця — у `tokens.css`: інакше два екрани дали б два кольори.
    expect(read(OWNERS[0])).toContain("--focus-ring-color: var(--accent)");
  });
});
