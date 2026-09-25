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
 * Картка товару (`mediaById`, `productCover`, `productPriceLabel`, `productCards`)
 * лежить **у спільному домені** (`@wwwuabot/shared/shop/cards.ts`): нею
 * користується й блок вітрини з `packages/ui`, а другої копії «що видно
 * покупцеві» бути не може.
 *
 * @module web-platform-dev/src/pages/shop
 */

import { productKindLabel, productPriceLabel, type ShopProduct } from "@wwwuabot/shared/shop";

/** Сегмент хвоста, яким магазин віддає товар (`/<магазин>/p/<товар>`). */
export const PRODUCT_SEGMENT = "p";
/** Сегмент категорії — стоїть поруч, бо каталог ходить тим самим хвостом. */
export const CATEGORY_SEGMENT = "c";

/** Адреса товару так, як її читають: зі слешем, без домену. */
export function productAddressLabel(shopSlug: string, product: Pick<ShopProduct, "slug">): string {
  return `/${shopSlug}/${PRODUCT_SEGMENT}/${product.slug}`;
}

/** Другий рядок у списку: вид і ціна — те, чого не видно з назви. */
export function productHint(product: Pick<ShopProduct, "kind" | "price">): string {
  return `${productKindLabel(product.kind)} · ${productPriceLabel(product.price)}`;
}

/** Чернетка — товар, який бачить лише продавець. */
export function productStateLabel(product: Pick<ShopProduct, "isActive">): string {
  return product.isActive ? "У каталозі" : "Чернетка";
}

/**
 * Другий рядок картки магазину: скільки товарів і що з ними робити.
 *
 * Число стоїть як «Товарів у магазині: 3», а не «3 товари»: підпис мусить бути
 * правильним для будь-якого числа, а кількість тут — довідка, не речення.
 */
export function shopProductsHint(loading: boolean, count: number): string {
  if (loading) return "Завантаження товарів…";
  if (count === 0) return "Товарів ще немає. Додайте перший — він зʼявиться під вітриною.";
  return `Товарів у магазині: ${count}`;
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
