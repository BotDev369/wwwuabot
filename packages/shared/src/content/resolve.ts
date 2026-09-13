/**
 * Правило «яка сторінка відповідає цьому URL».
 *
 * **Навіщо окремо.** Це правило було реалізоване тричі й по-різному:
 * в API — SQL-умовою `web_slug = ? OR codeword = ?` з відкатом на `__base__`,
 * у платформі — виразом `splat || "__base__"`, у `SiteRenderer` — пошуком
 * `pages.find(p => p.slug === currentSlug) ?? pages[0]`. Кожна з трьох
 * відповідала на те саме питання, і жодна не була записана як правило.
 *
 * Функція **чиста**: вона не ходить у базу. Які сторінки взагалі доступні,
 * вирішує сховище (SQL-фільтр або список у пам'яті) — бо в редакторі чернетка
 * мусить бути видимою, а назовні ні.
 *
 * @module @wwwuabot/shared/content/resolve
 */

import type { ContentPage } from "./types";

/** Ключ головної сторінки платформи: порожній шлях у URL. */
export const HOME_KEY = "__base__";

/**
 * Перетворює шлях із URL на ключ сторінки.
 *
 * Порожній шлях, `undefined` і сам `HOME_KEY` дають `HOME_KEY`: головна
 * сторінка мусить відкриватись однаково — і з `/`, і з `/sites` у майбутньому
 * маршруті. Провідні слеші зрізаються, бо `web_slug` у базі зберігається без них.
 */
export function contentKeyFromPath(ref?: string | null): string {
  const trimmed = (ref ?? "").trim().replace(/^\/+/, "");
  return trimmed === "" ? HOME_KEY : trimmed;
}

/**
 * Вибирає сторінку з набору за посиланням.
 *
 * Порядок навмисний:
 *   1. точний збіг за ключем **або** за `web_slug` — один `web_slug` може
 *      вказувати на сторінку, ключ якої зветься інакше;
 *   2. головна сторінка (`HOME_KEY`) — вона є завжди, навіть якщо нічого не
 *      просили;
 *   3. `null` — хай виклик вирішує, що показувати (у сайті це «сторінка не
 *      знайдена», у платформи — фолбек).
 *
 * Останній відкат — саме рішення виклику, і його тут немає навмисно: «показати
 * першу-ліпшу сторінку» і «показати 404» — це різні продукти, а не різні
 * реалізації одного правила.
 */
export function pickContentPage(
  pages: readonly ContentPage[],
  ref?: string | null,
): ContentPage | null {
  const key = contentKeyFromPath(ref);

  const byRef = pages.find(
    (page) => page.key === key || (page.webSlug !== null && page.webSlug === key),
  );
  if (byRef) return byRef;

  return pages.find((page) => page.key === HOME_KEY) ?? null;
}
