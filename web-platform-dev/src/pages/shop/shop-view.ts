/**
 * Подання магазину — чисті функції, яких не видно з даних.
 *
 * Тут живуть рівно ті речі, які мусять звучати **однаково** на всіх екранах:
 * адреса товару, підпис ціни, головне фото й стан чернетки. Розійтись вони
 * могли б непомітно: два рядки списку в різних екранах — це вже два правила
 * одного факту (`AGENTS.md` §7). Тому тексти тут, а розмітка — у компонентах;
 * саме тому це й перевіряється без DOM.
 *
 * **Адреса товару — хвіст адреси магазину** (`/<магазин>/p/<товар>`): окремої
 * адреси в товару немає, і саме тому тут вона складається з двох частин
 * (`docs/SHOPS.md` §2).
 *
 * @module web-platform-dev/src/pages/shop
 */

import { productKindLabel, type ShopMedia, type ShopProduct } from "@wwwuabot/shared/shop";

/** Сегмент хвоста, яким магазин віддає товар (`/<магазин>/p/<товар>`). */
export const PRODUCT_SEGMENT = "p";
/** Сегмент категорії — стоїть поруч, бо каталог ходить тим самим хвостом. */
export const CATEGORY_SEGMENT = "c";

/** Адреса товару так, як її читають: зі слешем, без домену. */
export function productAddressLabel(shopSlug: string, product: Pick<ShopProduct, "slug">): string {
  return `/${shopSlug}/${PRODUCT_SEGMENT}/${product.slug}`;
}

/** Ціна так, як її читають. Порожня — «Ціна не вказана», а не порожнє місце. */
export function productPriceLabel(price: string): string {
  return price.trim() || "Ціна не вказана";
}

/** Другий рядок у списку: вид і ціна — те, чого не видно з назви. */
export function productHint(product: Pick<ShopProduct, "kind" | "price">): string {
  return `${productKindLabel(product.kind)} · ${productPriceLabel(product.price)}`;
}

/** Чернетка — товар, який бачить лише продавець. */
export function productStateLabel(product: Pick<ShopProduct, "isActive">): string {
  return product.isActive ? "У каталозі" : "Чернетка";
}

/** Файли за номерами: галерея товару тримає номери, а не адреси. */
export function mediaById(media: ShopMedia[]): Map<number, ShopMedia> {
  return new Map(media.map((file) => [file.id, file]));
}

/**
 * Фото товару в порядку показу; перше — головне.
 *
 * Номер, якого немає серед файлів, **пропускається**, а не дає порожнього місця:
 * рядок обліку могли прибрати, і галерея мусить показати решту замість того,
 * щоб малювати биту картинку.
 */
export function productPhotos(
  product: Pick<ShopProduct, "images">,
  media: ShopMedia[],
): ShopMedia[] {
  const byId = mediaById(media);
  return product.images.map((id) => byId.get(id)).filter((file): file is ShopMedia => !!file);
}

/** Головне фото — те, чим товар показують у списку; `null` — фото немає. */
export function productCover(
  product: Pick<ShopProduct, "images">,
  media: ShopMedia[],
): ShopMedia | null {
  return productPhotos(product, media)[0] ?? null;
}

/**
 * Чи стоїть файл у якомусь товарі.
 *
 * Потрібне перед видаленням: файл, який стоїть у товарі, зникне з його
 * галереї, і сказати про це треба **до** дії, а не після (`docs/SHOPS.md` §5).
 */
export function mediaInUse(mediaId: number, products: ShopProduct[]): boolean {
  return products.some((product) => product.images.includes(mediaId));
}
