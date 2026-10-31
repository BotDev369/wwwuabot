/**
 * `!important` — лише для вимкненого руху.
 *
 * Кожен форс означає, що автор правила не впевнений, хто переможе в каскаді;
 * далі кожен екран захищається власним `!important`, і єдиний стиль
 * закінчується. Виняток один і вузький: `prefers-reduced-motion` у
 * `reset.css`, де рух треба вимкнути попри будь-який селектор.
 *
 * @module packages/shared/src/styles/important.test
 */

/// <reference types="node" />

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const STYLES = "packages/shared/src/styles";
const RESET = `${STYLES}/reset.css`;

/** Усі CSS продукту, зокрема `admin/`: новий підкаталог не мусить випасти з-під гейта. */
function sheets(dir = STYLES): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((entry) => {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return sheets(rel);
    return entry.name.endsWith(".css") ? [rel] : [];
  });
}

/** Правила без коментарів: у них `!important` — розповідь, а не форс. */
function code(file: string): string {
  return readFileSync(join(ROOT, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

/**
 * Блок `prefers-reduced-motion` разом із межами: усередині є вкладене правило
 * `*, *::before, *::after`, тож проста регулярка до першої `}` не дійде.
 */
function reducedMotion(css: string): { body: string; start: number; end: number } | undefined {
  const start = css.indexOf("@media (prefers-reduced-motion: reduce)");
  if (start < 0) return undefined;
  const open = css.indexOf("{", start);
  if (open < 0) return undefined;

  let depth = 0;
  for (let index = open; index < css.length; index += 1) {
    if (css[index] === "{") depth += 1;
    if (css[index] !== "}") continue;
    depth -= 1;
    if (depth === 0) return { body: css.slice(open + 1, index), start, end: index + 1 };
  }
  return undefined;
}

/** Єдині властивості, яким форс справді потрібен, щоб зупинити рух. */
const ALLOWED = [
  "animation-duration",
  "animation-iteration-count",
  "transition-duration",
  "scroll-behavior",
];

describe("!important лише для вимкненого руху", () => {
  it("у reset.css форс живе тільки в блоці prefers-reduced-motion", () => {
    const reset = code(RESET);
    const block = reducedMotion(reset);
    if (!block) throw new Error("блок prefers-reduced-motion у reset.css мусить існувати");

    const declarations = [...block.body.matchAll(/([a-z-]+)\s*:[^;]*!important/g)].map(
      ([, prop]) => prop,
    );
    expect(declarations.sort(), "виняток — рівно чотири властивості руху").toEqual(
      [...ALLOWED].sort(),
    );

    const outside = reset.slice(0, block.start) + reset.slice(block.end);
    expect(outside, "поза блоком руху !important немає").not.toContain("!important");
  });

  it("жоден інший стиль не форсує каскад", () => {
    const offenders = sheets()
      .filter((file) => file !== RESET)
      .filter((file) => code(file).includes("!important"));
    expect(offenders, "!important — лише reduced-motion у reset.css").toEqual([]);
  });
});
