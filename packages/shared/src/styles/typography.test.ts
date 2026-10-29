/**
 * Типографіка елементів: **одна міра без `!important`**.
 *
 * Поки `h1`–`h3` і `p` задавав бренд (`android.css`) зі `!important`, будь-який
 * заголовок усередині екрана ставав 22px, будь-який абзац — 14px, і сторінки
 * розходились на око. Тепер типові значення живуть у `reset.css` і приходять із
 * токенів, а роль (частина сторінки, картка, рядок) перебиває їх **своїм
 * класом** — без війни специфічності.
 *
 * @module packages/shared/src/styles/typography.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

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
const brand = css("android.css");

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

describe("бренд не переписує типографіку елементів", () => {
  /**
   * Бренд — це характер (колір, радіус, щільність), а не розмір тексту: щойно
   * він починає ставити `!important` на `h2` чи `p`, кожен екран мусить
   * захищатися власним `!important`, і єдиний стиль закінчується.
   */
  it("не ставить `!important` на елементи тексту", () => {
    const offenders = [
      ...brand.matchAll(/(?:^|\n)([^\n{}@]*\b(?:h1|h2|h3|h4|p|body)\b[^\n{}@]*)\{([^}]*)\}/g),
    ]
      .filter((match) => match[2].includes("!important"))
      .map((match) => match[1].trim());
    expect(offenders, "типографіка елементів — у reset.css із токенів, без !important").toEqual([]);
  });
});
