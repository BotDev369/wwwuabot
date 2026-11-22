/**
 * Аркуш пошукових слів — обіцянка, яку можна перевірити.
 *
 * Тест читає `specs/bot-upgrade/keywords.md` і для **кожного** слова з нього
 * питає матчер, чи перший результат — саме той рядок. Так «забув додати
 * синонім» ловиться не очима, а прогоном, і аркуш не розходиться з кодом.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SearchEntry, SearchIndex } from "./match";
import { matchSearch } from "./match";

const SHEET = join(process.cwd(), "specs/bot-upgrade/keywords.md");

function cells(line: string): string[] {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

function readSheet(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  let section: "pages" | "products" | null = null;

  for (const line of readFileSync(SHEET, "utf8").split("\n")) {
    if (line.startsWith("## Сторінки")) section = "pages";
    if (line.startsWith("## Товари")) section = "products";
    if (!line.startsWith("|") || /^\|\s*-+/.test(line) || line.includes("---")) continue;

    const row = cells(line);
    if (row[0] === "slug" || row[0] === "магазин") continue;

    const terms = (row[row.length - 1] ?? "")
      .split(",")
      .map((term) => term.replace(/`/g, "").trim())
      .filter(Boolean);

    if (section === "pages" && row.length === 2) {
      const slug = row[0].replace(/`/g, "");
      entries.push({
        kind: "page",
        slug,
        title: slug || "головна",
        terms,
        href: slug ? `/${slug}` : "/",
      });
    }
    if (section === "products" && row.length === 3) {
      const shop = row[0].replace(/`/g, "");
      const slug = row[1].replace(/`/g, "");
      entries.push({
        kind: "product",
        slug,
        shopSlug: shop,
        title: slug,
        terms,
        href: `/${shop}/p/${slug}`,
      });
    }
  }

  return entries;
}

const entries = readSheet();
const index: SearchIndex = { builtAt: "test", entries };

describe("аркуш пошукових слів", () => {
  it("містить усі 20 сторінок і 21 товар", () => {
    expect(entries.filter((entry) => entry.kind === "page")).toHaveLength(20);
    expect(entries.filter((entry) => entry.kind === "product")).toHaveLength(21);
  });

  it("кожен синонім резолвиться у свій рядок", () => {
    const failures: string[] = [];
    for (const entry of entries) {
      for (const term of entry.terms) {
        const first = matchSearch(index, term, 5)[0];
        if (first?.entry.href !== entry.href) {
          failures.push(`${term} → ${first?.entry.href ?? "нічого"} (очікували ${entry.href})`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("кожен рядок аркуша має хоч одне слово", () => {
    expect(entries.filter((entry) => entry.terms.length === 0)).toEqual([]);
  });
});
