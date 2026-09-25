/**
 * Адреса сторінки, яку створила людина: одна сутність `slug` і два входи в неї.
 *
 * **Адресу не питають — її показують.** Людина змінює лише текст (у цьому й
 * сенс шаблону), тож адресу складають **з назви**: кирилиця перекладається
 * латиницею, з неї робиться сегмент. Поле адреси у формі лишається — щоб
 * побачити, що вийшло, і за потреби виправити, — але заповнювати його не
 * обов'язково: порожнє поле означає «склади сам».
 *
 * **Мова адреси — латиниця, і це не смак.** `slug` мусить без втрат стати і
 * веб-шляхом, і Telegram-payload (`?start=`), а Telegram приймає лише
 * `A-Za-z0-9_-`. Правила сегмента живуть у `content/resolve.ts` (одне місце на
 * дві оболонки й бота), а сам переклад кирилиці — у `content/slugify.ts`: він
 * потрібен **двічі** (сторінка й товар магазину), і друга копія таблиці
 * розійшлася б із першою. Тут лишається те, чого немає ні там, ні там, —
 * **стеля довжини** сторінки й **зайняті слова**.
 *
 * **Зайняті слова — це адреси платформи.** Сторінка відкривається за своїм
 * `slug` (catch-all у `ScenarioPage`), і саме тому сегмент `space` або `pages`
 * до неї ніколи не дійде: маршрут довший за catch-all і виграє. Список нижче —
 * перелік **верхніх сегментів** платформи; розбіжність із `app/routes.ts`
 * стереже тест у самій платформі, бо саме вона — їхній власник.
 *
 * @module @wwwuabot/shared/pages
 */

import { isValidSlug } from "../content/resolve";
import { transliterateSlug } from "../content/slugify";

/** Стеля довжини адреси. Позичена з Telegram: payload обрізається на 64 символах. */
export const PAGE_SLUG_MAX = 48;

/**
 * Верхні сегменти платформи, які не можуть стати адресою сторінки.
 *
 * `api` і `assets` — службові: воркер віддає за ними проксі й файли збірки, і
 * сторінка за такою адресою не відкрилась би взагалі.
 */
export const RESERVED_PAGE_SLUGS: readonly string[] = [
  "api",
  "assets",
  "contacts",
  "create",
  "messages",
  "notes",
  "pages",
  "profile",
  "space",
];

/** Слова, які вже щось означають у продукті. */
export function isReservedPageSlug(slug: string): boolean {
  return RESERVED_PAGE_SLUGS.includes(slug);
}

/** Сирий текст → сегмент адреси сторінки (переклад і стеля — спільні). */
export function normalizePageSlug(raw: unknown): string {
  return transliterateSlug(raw, PAGE_SLUG_MAX);
}

/** Чи це слово, яким уже названо щось у продукті (або яке неможливо вгадати). */
export function isPageSlugTakenByPlatform(slug: string): boolean {
  return isReservedPageSlug(normalizePageSlug(slug));
}

export type PageAddressResult = { ok: true; value: string } | { ok: false; message: string };

/**
 * Адреса з поля форми.
 *
 * Порожнє поле — не помилка: адресу складають із назви. Помилка — коли навіть
 * назва не дає сегмента (людина написала саме цифри-знаки) або коли сегмент
 * зайнятий платформою: сказати це треба **до** збереження, бо зайнятий slug
 * мовчки змінився б на «…-2», і посилання, яке людина запам'ятала, вело б у
 * інше місце.
 */
export function pageAddress(raw: unknown, title: string): PageAddressResult {
  const value = normalizePageSlug(raw) || normalizePageSlug(title);

  if (!value) {
    return { ok: false, message: "Адреса порожня — дайте сторінці назву латиницею або цифрами" };
  }
  if (!isValidSlug(value)) {
    return { ok: false, message: "В адресі — лише латинські літери, цифри й дефіс" };
  }
  if (isReservedPageSlug(value)) {
    return { ok: false, message: `Адреса «${value}» уже належить платформі — оберіть іншу` };
  }
  return { ok: true, value };
}
