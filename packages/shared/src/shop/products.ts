/**
 * Правила товару — те, за чим введене стає даними.
 *
 * Один файл на клієнт і сервер: форма в кабінеті продавця й перевірка в
 * `api-dev` беруть **ті самі** межі, тож поле не дає набрати те, що сервер
 * потім обріже мовчки (та сама межа, що в оголошеннях і сторінках).
 *
 * **Адреса товару — хвіст адреси магазину, і унікальна вона в межах
 * магазину.** «Кава» в двох різних магазинах — дві різні позиції, і
 * забороняти другу не було б за що; саме тому унікальність живе в схемі
 * (`UNIQUE (shop_id, slug)`), а не в цій перевірці. Тут лишається форма
 * сегмента й стеля довжини.
 *
 * **Ціна — текст, і це не недогляд:** «договірна», «2 000 ₴», «за
 * домовленістю» — теж ціна (та сама межа, що в оголошеннях).
 *
 * @module @wwwuabot/shared/shop
 */

import { isValidSlug } from "../content/resolve";
import { transliterateSlug } from "../content/slugify";
import { isProductKind, type ProductKind } from "./kinds";
import type { ProductAttribute, ProductDraft, ShopProduct } from "./types";

/**
 * Стеля адреси товару.
 *
 * Коротша за стелю сторінки навмисно: товар їде **хвостом** (`<магазин>_p_<товар>`),
 * а Telegram мовчки обрізає `?start=`, довший за 64 символи. Довжину цілого
 * payload ловить `isDeepLinkable` на побудові — тут тримається лише те, щоб
 * хвіст не з'їдав місця магазину.
 */
export const PRODUCT_SLUG_MAX = 24;

export const PRODUCT_TITLE_MAX = 120;
/** Короткий опис — те, що видно в каталозі, до відкриття товару. */
export const PRODUCT_SUMMARY_MAX = 200;
export const PRODUCT_DESCRIPTION_MAX = 4000;
/** Ціна — **текст**, а не число: «договірна» теж ціна. */
export const PRODUCT_PRICE_MAX = 40;
/** Скільки фото буває в галереї товару (перше — головне). */
export const PRODUCT_IMAGES_MAX = 12;
export const PRODUCT_ATTRIBUTES_MAX = 20;
export const ATTRIBUTE_NAME_MAX = 40;
export const ATTRIBUTE_VALUE_MAX = 120;

/** Рядок із краями, притиснутими до межі. */
export function sanitizeLine(raw: unknown, max: number): string {
  if (typeof raw !== "string") return "";
  return raw.replace(/\s+/gu, " ").trim().slice(0, max);
}

/** Опис товару: переноси абзаців зберігаються, краї — притискаються. */
export function sanitizeDescription(raw: unknown): string {
  if (typeof raw !== "string") return "";
  return raw.trim().slice(0, PRODUCT_DESCRIPTION_MAX);
}

export type ProductAddressResult = { ok: true; value: string } | { ok: false; message: string };

/**
 * Адреса товару з поля форми.
 *
 * Порожнє поле — не помилка: адресу складають **із назви** (людина змінює
 * текст, а не адресу). Помилка — коли навіть назва не дає сегмента.
 */
export function productAddress(raw: unknown, title: string): ProductAddressResult {
  const value =
    transliterateSlug(raw, PRODUCT_SLUG_MAX) || transliterateSlug(title, PRODUCT_SLUG_MAX);

  if (!value) {
    return { ok: false, message: "Адреса товару порожня — назвіть його латиницею або цифрами" };
  }
  if (!isValidSlug(value)) {
    return { ok: false, message: "В адресі товару — лише латинські літери, цифри й дефіс" };
  }
  return { ok: true, value };
}

/**
 * Характеристики товару: пари «назва — значення», як їх розуміє людина.
 *
 * Пари без назви **відкидаються**, а не зберігаються з порожнім ключем: рядок
 * «— 40 см» у переліку характеристик читався б як помилка показу, а не як
 * незаповнене поле. Повтор назви лишає першу пару — двох «Довжина» в одному
 * товарі не буває, і друга переписала б першу мовчки.
 */
export function sanitizeProductAttributes(raw: unknown): ProductAttribute[] {
  if (!Array.isArray(raw)) return [];

  const attributes: ProductAttribute[] = [];
  const seen = new Set<string>();
  for (const entry of raw) {
    if (typeof entry !== "object" || entry === null) continue;
    const source = entry as Record<string, unknown>;
    const name = sanitizeLine(source.name, ATTRIBUTE_NAME_MAX);
    const value = sanitizeLine(source.value, ATTRIBUTE_VALUE_MAX);
    if (!name || !value) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    attributes.push({ name, value });
    if (attributes.length >= PRODUCT_ATTRIBUTES_MAX) break;
  }
  return attributes;
}

/**
 * Номери файлів галереї: `images` товару — **номери** `shop_media`, не адреси.
 *
 * Адресу будує читання з ключа R2, і саме тому в рядку лежить номер: адреса
 * змінилася б разом із бакетом, а номер лишається.
 */
export function cleanImageIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];

  const ids: number[] = [];
  for (const entry of raw) {
    const id = Number(entry);
    if (!Number.isInteger(id) || id <= 0) continue;
    if (ids.includes(id)) continue;
    ids.push(id);
    if (ids.length >= PRODUCT_IMAGES_MAX) break;
  }
  return ids;
}

/** Те, що перевірено й готове до запису. */
export interface ProductInput {
  slug: string;
  kind: ProductKind;
  title: string;
  summary: string;
  description: string;
  price: string;
  images: number[];
  attributes: ProductAttribute[];
  isActive: boolean;
}

export type ProductValidation = { ok: true; value: ProductInput } | { ok: false; message: string };

/**
 * Товар → те, що надсилає форма: один бік правди для правки й перемикача.
 *
 * Потрібне саме тому, що правка — це **надсилання цілого товару**, а не
 * окремих полів: інакше зміна видимості зі списку вимагала б другого шляху на
 * сервері, і двоє правил «що можна змінити» розійшлися б (`pageDraft` у
 * сторінок — той самий випадок).
 */
export function productDraft(product: ShopProduct): ProductDraft {
  return {
    id: product.id,
    kind: product.kind,
    title: product.title,
    summary: product.summary,
    description: product.description,
    price: product.price,
    address: product.slug,
    images: product.images,
    attributes: product.attributes,
    isActive: product.isActive,
  };
}

/**
 * Перевірка товару.
 *
 * Обов'язкові два поля, і обидва — не формальність: **назва** (без неї в
 * каталозі нема чого показати) і **вид** (він вирішує, чи питати адресу
 * доставки й чи буває в товару файл). Решта може лишатись порожньою: товар
 * без опису — це опис, який ще не написали, а не помилка. Довжини
 * притискаються, а не відхиляються.
 */
export function validateProductDraft(raw: unknown): ProductValidation {
  if (typeof raw !== "object" || raw === null) return { ok: false, message: "Очікується товар" };
  const source = raw as Record<string, unknown>;

  if (!isProductKind(source.kind)) return { ok: false, message: "Оберіть вид товару" };

  const title = sanitizeLine(source.title, PRODUCT_TITLE_MAX);
  if (!title) return { ok: false, message: "Назва товару — обов'язкова" };

  const address = productAddress(source.address, title);
  if (!address.ok) return address;

  return {
    ok: true,
    value: {
      slug: address.value,
      kind: source.kind,
      title,
      summary: sanitizeLine(source.summary, PRODUCT_SUMMARY_MAX),
      description: sanitizeDescription(source.description),
      price: sanitizeLine(source.price, PRODUCT_PRICE_MAX),
      images: cleanImageIds(source.images),
      attributes: sanitizeProductAttributes(source.attributes),
      // Прапорець видимості: відсутній означає «у каталозі». Явне `false`
      // лишає товар чернеткою — він у списку продавця, але покупець його не
      // бачить.
      isActive: source.isActive !== false,
    },
  };
}
