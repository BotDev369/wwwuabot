/// <reference types="node" />

/**
 * Шапка «Аналітики» — один закріплений блок: назва з діями й зведення.
 * Окрема заливка в кожного ряду лишала б між ними шов, крізь який видно журнал.
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
  it("сторінка не має власних полів — шар закриває всю ширину прокрутки", () => {
    const page = body("\\.ana-page");

    expect(page, "правило сторінки мусить існувати").not.toBe("");
    expect(page).not.toContain("padding");
    expect(page).toContain("--ana-gutter: var(--sp-5)");
    // Мобільна мірка міняється на тому самому 768px, що й відступ шапки
    // (`app-chrome.css`): інакше назва й картки розійшлися б на планшеті.
    expect(CSS).toMatch(
      /@media \(max-width: 768px\) \{\s*\.ana-page \{\s*--ana-gutter: var\(--sp-4\)/,
    );
  });

  it("шапка, зведення й період — один липкий шар зі своїм тлом", () => {
    const pinned = body("\\.ana-pinned");

    expect(pinned).toContain("position: sticky");
    expect(pinned).toContain("top: 0");
    // Заливка обов'язкова й непрозора: під шаром їде журнал.
    expect(pinned).toContain("background: var(--bg-page");
    // Проміжки всередині — `gap` шару: вони теж закриті тлом, а не прозорі.
    expect(pinned).toContain("gap: var(--sp-3)");
    expect(pinned).toContain("padding: var(--sp-3) var(--ana-gutter)");
  });

  it("період — кнопка в ряду дій, а не окремий ряд у шапці", () => {
    const source = readFileSync(
      join(REPO_ROOT, "web-admin-dev/src/pages/analytics/AnalyticsPage.tsx"),
      "utf8",
    );

    // Ряд чипів з'їдав місце в шапці — вибір живе в модалці.
    expect(source).not.toContain("ana-periods");
    expect(source).toContain('className="wb-btn wb-btn-secondary ana-period-btn"');
    expect(body("\\.ana-period-btn")).toContain("min-height");
  });

  it("зведення стоїть на сітці й тягнеться на всю ширину, як чипи й картки", () => {
    const stats = body("\\.ana-stats");

    expect(stats).toContain("display: grid");
    expect(stats).toContain("grid-template-columns: repeat(4, minmax(0, 1fr))");
    // Смуга, яка обривається на власній `max-width`, читається як окрема
    // коробка посеред екрана: її край мусить збігатися з рештою рядів.
    expect(stats).not.toContain("max-width");
  });

  it("вага назви не залежить від типового `h1`", () => {
    const source = readFileSync(
      join(REPO_ROOT, "web-admin-dev/src/pages/analytics/AnalyticsPage.tsx"),
      "utf8",
    );

    expect(source).toContain('className="ana-head-title"');
    expect(body("\\.ana-head-title")).toContain("font-weight: var(--weight-bold)");
  });

  it("у розмітці обидва ряди живуть у закріпленому шарі, вміст — під ними", () => {
    const source = readFileSync(
      join(REPO_ROOT, "web-admin-dev/src/pages/analytics/AnalyticsPage.tsx"),
      "utf8",
    );

    const pinned = source.indexOf('className="ana-pinned"');
    const head = source.indexOf('className="ana-head"');
    const stats = source.indexOf('className="ana-stats"');
    const content = source.indexOf('className="ana-body"');

    expect(pinned).toBeGreaterThan(-1);
    expect(head).toBeGreaterThan(pinned);
    expect(stats).toBeGreaterThan(head);
    expect(content).toBeGreaterThan(stats);
  });
});
