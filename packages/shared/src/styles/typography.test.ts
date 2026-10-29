/**
 * Типографіка елементів: **одна міра без `!important`**.
 *
 * Поки `h1`–`h3` і `p` задавав другий шар стилів зі `!important`, будь-який
 * заголовок усередині екрана ставав 22px, будь-який абзац — 14px, і сторінки
 * розходились на око. Тепер типові значення живуть у `reset.css` і приходять із
 * токенів, а роль (частина сторінки, картка, рядок) перебиває їх **своїм
 * класом** — без війни специфічності.
 *
 * Другий сторож тут — від **другого шару** взагалі: атрибут `data-brand` і
 * файл-стиль не мусять повернутися ні в CSS, ні в код, ні в розмітку.
 *
 * @module packages/shared/src/styles/typography.test
 */

/// <reference types="node" />

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

function css(name: string): string {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

function rule(source: string, selector: string): string {
  const start = source.indexOf(`\n${selector} {`);
  expect(start, `правило ${selector} має існувати`).toBeGreaterThan(-1);
  const open = source.indexOf("{", start);
  const close = source.indexOf("\n}", open);
  return source.slice(open, close);
}

const tokens = css("tokens.css");
const reset = css("reset.css");

/** Стилі продукту — без каркасів і білдів. */
const STYLE_FILES = readdirSync(new URL(".", import.meta.url))
  .filter((name) => name.endsWith(".css"))
  .map((name) => `packages/shared/src/styles/${name}`)
  .concat([
    "web-platform-dev/src/index.css",
    "web-admin-dev/src/index.css",
    "web-admin-dev/src/monitoring.css",
  ]);

describe("заголовки документа", () => {
  it("міряються токенами", () => {
    for (const token of ["--h1-size", "--h1-weight", "--h2-size", "--h2-weight", "--h3-size"]) {
      expect(tokens, token).toContain(`${token}:`);
    }
    expect(rule(reset, "h1")).toContain("font-size: var(--h1-size)");
    expect(rule(reset, "h2")).toContain("font-size: var(--h2-size)");
    expect(rule(reset, "h3")).toContain("font-size: var(--h3-size)");
  });

  it("не потребують `!important` — роль перебиває елемент своїм класом", () => {
    for (const selector of ["h1", "h2", "h3"]) {
      expect(rule(reset, selector), selector).not.toContain("!important");
    }
  });
});

describe("типографіка елементів — лише в reset.css", () => {
  /**
   * Щойно будь-який інший файл починає ставити `!important` на `h2` чи `p`,
   * кожен екран мусить захищатися власним `!important`, і єдиний стиль
   * закінчується.
   */
  it("жоден стиль не ставить `!important` на самі елементи тексту", () => {
    // Саме на **самі** елементи: правило `.shop-store p` — це вже роль
    // (вітрина магазину), а не типовий розмір абзацу продукту.
    const bare = /^(?:h1|h2|h3|h4|p|body)$/;
    const offenders: string[] = [];
    for (const file of STYLE_FILES) {
      const source = readFileSync(join(REPO_ROOT, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      for (const [, selector, body] of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!body.includes("!important")) continue;
        const parts = selector.split(",").map((part) => part.trim());
        if (!parts.some((part) => bare.test(part))) continue;
        offenders.push(`${file}: ${selector.replace(/\s+/g, " ").trim()}`);
      }
    }
    expect(offenders, "типографіка елементів — у reset.css із токенів, без !important").toEqual([]);
  });
});

describe("другого шару стилів немає", () => {
  /**
   * `data-brand` був атрибутом, під яким жив другий стиль: будь-яке правило
   * можна було написати двічі, і саме так розходились кеглі, береги й радіуси
   * між екранами. Повертатися йому нема чого — стиль один.
   */
  it("`data-brand` не згадується ні в CSS, ні в коді, ні в розмітці", () => {
    const sources: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(join(REPO_ROOT, dir))) {
        if (/^(node_modules|dist|coverage|\.git|\.freebuff)$/.test(name)) continue;
        const rel = join(dir, name);
        if (statSync(join(REPO_ROOT, rel)).isDirectory()) {
          walk(rel);
          continue;
        }
        if (!/\.(?:css|ts|tsx|html|md|mjs|json)$/.test(name)) continue;
        if (/\.test\.(?:ts|tsx)$/.test(name)) continue;
        if (name === "typography.test.ts") continue;
        sources.push(rel);
      }
    };
    for (const dir of [
      "packages",
      "web-platform-dev/src",
      "web-admin-dev/src",
      "bot-dev/src",
      "api-dev/src",
      "docs",
    ]) {
      walk(dir);
    }

    const offenders = sources
      .filter((file) => !file.includes("package-lock"))
      .filter((file) => readFileSync(join(REPO_ROOT, file), "utf8").includes("data-brand"));
    expect(offenders, "стиль продукту один — атрибута вибору стилю немає").toEqual([]);
  });

  it("файлу-шару стилів у пакеті немає", () => {
    const files = readdirSync(new URL(".", import.meta.url));
    expect(files.filter((name) => /^(?:android|apple|brand)\.css$/.test(name))).toEqual([]);
  });
});
