/**
 * @wwwuabot/shared/search — один механізм пошуку на бота й `api-dev`.
 * Друга копія нормалізації розійшлася б із першою; тут — експорти й стартові слова.
 *
 * @module @wwwuabot/shared/search
 */

import { normalizeSearchKey } from "./normalize";

export { editDistance, normalizeSearchKey, searchTokens } from "./normalize";
export { SEARCH_RESULT_LIMIT, matchSearch } from "./match";
export type { SearchEntry, SearchIndex, SearchMatch } from "./match";

/** Скільки пошукових слів тримає один рядок: більше — вже не слова. */
const TERMS_MAX = 24;

/**
 * Початкові пошукові слова нового рядка — з назви, адреси й транслітерації.
 *
 * **Це не заміна ручним словам, а гарантія.** Людина забуває заповнити поле;
 * тоді товар із назвою «Мʼята перцева» все одно знаходиться за «мята» й
 * «myata». Синоніми, якими річ називають покупці, додають руками — цього з
 * назви не вивести.
 */
export function searchTermsFrom(title: string, slug: string): string[] {
  const clean = (value: string): string => value.trim().replace(/\s+/g, " ");
  const words = `${title} ${slug.replace(/[-_/]+/g, " ")}`
    .split(/\s+/)
    .map(clean)
    .filter((word) => word.length >= 3);

  const terms: string[] = [];
  const add = (value: string): void => {
    const next = clean(value);
    if (!next || terms.length >= TERMS_MAX) return;
    if (!terms.some((term) => normalizeSearchKey(term) === normalizeSearchKey(next))) {
      terms.push(next);
    }
  };

  add(title);
  add(slug.replace(/[-_/]+/g, " "));
  for (const word of words) add(word);

  return terms;
}
