/**
 * Збіг запиту з індексом і порядок відповіді.
 * Точна назва → точне слово → початок → входження → усі слова → одна одруківка:
 * без порядку «коти» знаходили б «дівчат-котів» раніше за «сердитих котів».
 *
 * @module @wwwuabot/shared/search/match
 */

import { editDistance, normalizeSearchKey, searchTokens } from "./normalize";

/** Що показує картка результату; адресу будує той, хто рендерить. */
export interface SearchEntry {
  kind: "page" | "product";
  /** Адреса сторінки (`galyashop`) або магазин товару. */
  slug: string;
  /** Для товару — адреса магазину. */
  shopSlug?: string;
  title: string;
  /** Підпис під назвою: «Магазин», «Стаття», назва магазину товару. */
  subtitle?: string;
  price?: string;
  /** Абсолютна адреса фото; порожня — рендер бере заглушку. */
  photo?: string;
  terms: string[];
  /** Шлях на платформі: `/galyashop`, `/galyashop/p/astrahal`. */
  href: string;
}

export interface SearchIndex {
  builtAt: string;
  entries: SearchEntry[];
}

export interface SearchMatch {
  entry: SearchEntry;
  score: number;
}

/** Скільки карток показуємо: більше — це вже не відповідь, а список. */
export const SEARCH_RESULT_LIMIT = 5;

/** Мінімальна довжина для входження: «і» не мусить знаходити все. */
const MIN_SUBSTRING = 3;

function scoreOf(entry: SearchEntry, query: string, tokens: string[]): number {
  const title = normalizeSearchKey(entry.title);
  const terms = entry.terms.map(normalizeSearchKey).filter(Boolean);
  const key = normalizeSearchKey(query);

  if (!key) return 0;

  if (title === key) return 100;
  if (terms.includes(key)) return 90;
  if (title.startsWith(key)) return 85;
  if (key.length >= MIN_SUBSTRING && (title.includes(key) || key.includes(title))) return 80;
  if (terms.some((term) => term.startsWith(key))) return 75;
  if (key.length >= MIN_SUBSTRING && terms.some((term) => term.includes(key))) return 70;

  const allTokens =
    tokens.length > 0 &&
    tokens.every((token) => title.includes(token) || terms.some((term) => term.includes(token)));
  if (allTokens) return 60;

  const fuzzy =
    (key.length >= 5 && editDistance(key, title, 1) <= 1) ||
    terms.some((term) => key.length >= 5 && editDistance(key, term, 1) <= 1);
  if (fuzzy) return 40;

  return 0;
}

/**
 * Знайти до `limit` збігів. Порожній масив — «нічого не знайдено», і це
 * відповідь, а не помилка.
 */
export function matchSearch(
  index: SearchIndex | null | undefined,
  query: string,
  limit = SEARCH_RESULT_LIMIT,
): SearchMatch[] {
  const key = normalizeSearchKey(query);
  if (!key || !index) return [];

  const tokens = searchTokens(query);
  const matches: SearchMatch[] = [];
  for (const entry of index.entries) {
    const score = scoreOf(entry, query, tokens);
    if (score > 0) matches.push({ entry, score });
  }

  return matches
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title, "uk"))
    .slice(0, Math.max(1, limit));
}
