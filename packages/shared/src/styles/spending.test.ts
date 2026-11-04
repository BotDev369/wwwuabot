/**
 * Сторож таблиць Є-data: вони лишаються таблицями на будь-якій ширині, а
 * ширини колонок складаються у 100% — інакше перші дві колонки не вміщуються
 * й закріплений підпис рядка втрачає сенс (розбір CSS як тексту — `dates.test.ts`).
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
  it("мають ширину, від якої їдуть убік, а не стискаються в ніщо", () => {
    for (const table of Object.keys(TABLES)) {
      expect(wide, table).toMatch(new RegExp(`\\.spend-table--${table} \\{\\s*min-width: \\d+px;`));
    }
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

  it("на телефоні таблиця лишається таблицею: шапка й підпис не ховаються", () => {
    expect(phone).not.toContain("display: none");
    expect(phone).not.toContain("attr(data-label)");
    expect(phone).not.toContain("min-width: 0");
  });

  it("на телефоні висоту дає сторінка, а не окрема скрол-рамка", () => {
    expect(phone).toContain(".wb-table-scroll");
    expect(phone).toContain("max-height: none");
  });

  it("на широкому екрані карткова розкладка не вмикається", () => {
    expect(wide).not.toContain("attr(data-label)");
    expect(wide).not.toContain("overflow-x: visible");
  });
});
