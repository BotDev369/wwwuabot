/**
 * Сторож таблиць Є-data: таблиця тягнеться на всю ширину картки (без скролу
 * вбік), а ширини колонок складаються у 100% — інакше числа виносять підпис за
 * екран (розбір CSS як тексту — `dates.test.ts`).
 *
 * @module packages/shared/src/styles/spending.test
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./admin/spending.css", import.meta.url), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

/** Телефонна частина файлу — усе, що стоїть після маркера медіазапиту. */
const [wide, phone = ""] = css.split("@media (max-width: 768px)");

/** Скільки колонок у кожній таблиці — щоб сума ширини дорівнювала 100%. */
const TABLES: Readonly<Record<string, number>> = {
  orgs: 5,
  payments: 5,
  codes: 4,
  recipients: 4,
  sync: 6,
  documents: 5,
  transactions: 5,
  sources: 2,
};

/** Ширини колонок таблиці: `th:nth-child(n)`, зокрема в групових селекторах. */
function columnWidths(table: string): number[] {
  const widths = new Map<number, number>();
  for (const [, head, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!head.includes(`.spend-table--${table}`) || !head.includes("nth-child")) continue;
    const width = Number(body.match(/width:\s*([\d.]+)%/)?.[1]);
    if (!width) continue;
    for (const [, index] of head.matchAll(/nth-child\((\d+)\)/g)) {
      widths.set(Number(index), width);
    }
  }
  return [...widths.values()];
}

describe("таблиці Є-data", () => {
  it("таблиця тягнеться на всю ширину картки: жодного `min-width` для скролу вбік", () => {
    expect(wide).not.toMatch(/\.spend-table--[\w-]+ \{[^}]*min-width/);
  });

  it("на телефоні відступ сторінки — єдина мірка, на неї спирається липка шапка", () => {
    expect(css).toContain("--spend-pad: var(--sp-5)");
    expect(phone).toContain("--spend-pad: var(--sp-3)");
  });

  it("ширини колонок складаються у 100% і покривають кожну колонку", () => {
    for (const [table, count] of Object.entries(TABLES)) {
      const widths = columnWidths(table);
      expect(widths, table).toHaveLength(count);
      const sum = widths.reduce((total, width) => total + width, 0);
      expect(sum, table).toBeGreaterThan(99);
      expect(sum, table).toBeLessThan(101);
    }
  });

  it("на телефоні немає карткової розкладки й горизонтального скролу", () => {
    expect(phone).not.toContain("attr(data-label)");
    expect(phone).not.toContain("overflow-x");
    expect(phone).not.toContain(".wb-table-scroll");
  });

  it("на широкому екрані карткова розкладка не вмикається", () => {
    expect(wide).not.toContain("attr(data-label)");
    expect(wide).not.toContain("overflow-x: visible");
  });
});
