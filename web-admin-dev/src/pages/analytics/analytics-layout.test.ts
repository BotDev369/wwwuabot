/// <reference types="node" />

/**
 * Шапка «Аналітики» й ряд періодів — один закріплений блок.
 *
 * Шапка стоїть поза прокруткою, а чипи липнуть до неї. Через це в сторінки
 * немає верхнього відступу: `padding` над липким рядом — це прозора смуга, у
 * якій видно список, тобто дірка посеред блока. Бокова мірка в чипів така
 * сама, як у сторінки й шапки, інакше назва, знаки, чипи й картки стоять на
 * трьох різних лініях.
 *
 * @module web-admin-dev/src/pages/analytics/analytics-layout
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));

const CSS = readFileSync(join(REPO_ROOT, "web-admin-dev/src/index.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Тіло правила без коментарів: у них ті самі слова, що в селекторах. */
function body(selector: string): string {
  return new RegExp(`${selector}\\s*\\{([^}]*)\\}`).exec(CSS)?.[1] ?? "";
}

describe("аналітика: закріплений блок керування", () => {
  it("сторінка не має верхнього відступу — ряд липне до шапки впритул", () => {
    const page = body("\\.ana-page");

    expect(page, "правило сторінки мусить існувати").not.toBe("");
    expect(page).toContain("padding: 0 var(--ana-gutter)");
  });

  it("бокова мірка одна: її дістають і сторінка, і заливка ряду", () => {
    expect(body("\\.ana-page")).toContain("--ana-gutter: var(--sp-5)");
    // Мобільна мірка міняється на тому самому 768px, що й відступ шапки
    // (`app-chrome.css`): між 640 і 768 сторінка й шапка інакше розійшлися б.
    expect(CSS).toMatch(
      /@media \(max-width: 768px\) \{\s*\.ana-page \{\s*--ana-gutter: var\(--sp-4\)/,
    );
  });

  it("ряд періодів: липне, заливка від краю до краю, чипи на лінії карток", () => {
    const periods = body("\\.ana-periods");

    expect(periods).toContain("position: sticky");
    expect(periods).toContain("top: 0");
    expect(periods).toContain("margin: 0 calc(var(--ana-gutter) * -1)");
    expect(periods).toContain("padding: var(--sp-2) var(--ana-gutter)");
  });

  it("у розмітці ряд стоїть першим — вище нього немає що прокручувати", () => {
    const source = readFileSync(
      join(REPO_ROOT, "web-admin-dev/src/pages/analytics/AnalyticsPage.tsx"),
      "utf8",
    );

    const page = source.indexOf('className="ana-page"');
    const periods = source.indexOf('className="ana-periods"');
    const settings = source.indexOf('className="ana-settings"');

    expect(page).toBeGreaterThan(-1);
    expect(periods).toBeGreaterThan(page);
    expect(settings).toBeGreaterThan(periods);
  });
});
