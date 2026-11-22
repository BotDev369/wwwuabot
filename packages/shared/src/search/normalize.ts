/**
 * Нормалізація пошукового ключа: регістр, пробіли, пунктуація, транслітерація.
 * Індекс і запит проходять **ту саму** функцію — інакше «Галя Шоп» і «galyashop»
 * розійшлися б рівно тоді, коли хтось додав нову літеру.
 *
 * @module @wwwuabot/shared/search/normalize
 */

const TRANSLIT: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ye",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "yi",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ь: "",
  ю: "yu",
  я: "ya",
};

/** Латиниця з діакритикою, яку люди вживають замість українських літер. */
const LATIN_FOLD: Record<string, string> = {
  á: "a",
  é: "e",
  í: "i",
  ó: "o",
  ú: "u",
  ý: "y",
  š: "sh",
  č: "ch",
  ž: "zh",
};

/** Один ключ для порівняння: без регістру, пробілів і пунктуації. */
export function normalizeSearchKey(value: unknown): string {
  const text = String(value ?? "")
    .toLowerCase()
    .normalize("NFC")
    .replace(/[’ʼ'`´]/g, "")
    .replace(/[^0-9a-zа-яїієґ]/g, "");

  let out = "";
  for (const char of text) {
    out += TRANSLIT[char] ?? LATIN_FOLD[char] ?? char;
  }
  return out.replace(/[^0-9a-z]/g, "");
}

/**
 * Слова запиту — для випадку, коли фраза не збігається, а кожне слово окремо
 * знаходиться в пошукових словах.
 */
export function searchTokens(value: unknown): string[] {
  return String(value ?? "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => normalizeSearchKey(token))
    .filter((token) => token.length > 0);
}

/** Відстань редагувань із раннім виходом: більше за `limit` не цікавить. */
export function editDistance(a: string, b: string, limit = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > limit) return limit + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      current.push(value);
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > limit) return limit + 1;
    previous = current;
  }
  return previous[b.length];
}
