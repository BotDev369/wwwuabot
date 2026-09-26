/**
 * Картка товару — **те, що видно в сітці каталогу**.
 *
 * Між рядком `shop_products` і розміткою стоїть один переклад: товар має
 * адресу фото (ключ R2), а картка — готовий `photoUrl`; ціна в товарі може
 * бути порожньою, а в картці мусить щось стояти; чернетка в товарі — це
 * `isActive`, а в картці її немає взагалі.
 *
 * **Один переклад на всіх, хто показує товари.** Сітку малює блок шаблону
 * (`packages/ui/src/blocks/ShopGridBlock.tsx`), список продавця — екран
 * платформи, і якби кожен складав картку сам, «що видно покупцеві» стало б
 * двома правилами: одна сітка показала б чернетку, друга — ні (`AGENTS.md` §7).
 *
 * **Чернетка карткою не стає ніколи.** Відсів стоїть тут, а не в тому, хто
 * кличе: `productCards` віддає рівно те, що видно покупцеві, тож список
 * продавця (там чернетки потрібні) бере інші функції — `productPhotos`,
 * `productStateLabel`.
 *
 * @module @wwwuabot/shared/shop
 */

import { productKindLabel } from "./kinds";
import { mediaUrl } from "./media";
// Розділ — те саме поле товару, що й у формі: одне правило на обидва боки.
import { UNCATEGORIZED_CATEGORY_TITLE, productCategoryLabel } from "./products";
import type { ShopMedia, ShopProduct } from "./types";

/** Товар так, як його бачить покупець у сітці. */
export interface ShopCard {
  id: number;
  title: string;
  /** Ціна як текст; порожня — «Ціна не вказана», а не порожнє місце. */
  price: string;
  /** Головне фото (`/api/shop/media/<ключ>`); `null` — фото ще не додали. */
  photoUrl: string | null;
  /** Вид товару словом («Фізичний товар») — покупцеві він каже, як це отримати. */
  kindLabel: string;
  /** Короткий опис; порожній — картка без нього, а не з порожнім рядком. */
  summary: string;
  /** Розділ каталогу, у якому стоїть картка: порожній товар читається як «Інші». */
  category: string;
}

/** Ціна так, як її читають. Порожня — «Ціна не вказана», а не порожнє місце. */
export function productPriceLabel(price: string): string {
  const trimmed = price.trim();
  if (!trimmed) return "Ціна не вказана";
  // Числову ціну без валюти (напр. "1500" чи "1500.00") приводимо до формату "1 500 ₴"
  const clean = trimmed.replace(/\s+/g, "").replace(",", ".");
  if (/^\d+(?:\.\d+)?$/.test(clean)) {
    const num = parseFloat(clean);
    if (Number.isFinite(num)) {
      const formatted = Math.round(num)
        .toString()
        .replace(/\B(?=(\d{3})+(?!\d))/gu, "\u00a0");
      return `${formatted} ₴`;
    }
  }
  return trimmed;
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
 * Товари → сітка каталогу.
 *
 * Без фото картка теж картка: `photoUrl: null` означає «тут буде фото», і
 * місце під нього тримає розмітка (`.shop-card-img--empty`) — інакше рядок
 * товару стрибав би від того, чи завантажили знімок.
 */
export function productCards(products: ShopProduct[], media: ShopMedia[]): ShopCard[] {
  return products
    .filter((product) => product.isActive)
    .map((product) => {
      const cover = productCover(product, media);
      return {
        id: product.id,
        title: product.title,
        price: productPriceLabel(product.price),
        photoUrl: cover ? mediaUrl(cover.key) : null,
        kindLabel: productKindLabel(product.kind),
        summary: product.summary,
        category: productCategoryLabel(product.category),
      };
    });
}

/** Розділ каталогу так, як його показує вітрина: назва й скільки в ньому товарів. */
export interface ShopCatalog {
  /** Назва розділу: вона ж ключ — іншого імені в розділу немає (`products.ts`). */
  title: string;
  count: number;
}

/**
 * Розділи каталогу — з **показаних** товарів, а не з окремого списку.
 *
 * Порядок сталий і не залежить від того, як товари лягли в базу: спершу
 * названі розділи за алфавідом, «Інші товари» — останніми. Так розділ не
 * стрибає з місця на місце після кожного збереження товару.
 *
 * Ім'я тут те саме, що в картці (`productCategoryLabel`), тож кнопки розділів
 * і картки не розійдуться: порожній розділ у товарі читається як «Інші товари»
 * в обох місцях.
 */
export function shopCatalogs(products: ShopProduct[]): ShopCatalog[] {
  const counts = new Map<string, number>();
  for (const product of products) {
    if (!product.isActive) continue;
    const title = productCategoryLabel(product.category);
    counts.set(title, (counts.get(title) ?? 0) + 1);
  }

  const others = counts.get(UNCATEGORIZED_CATEGORY_TITLE) ?? 0;
  counts.delete(UNCATEGORIZED_CATEGORY_TITLE);

  const named = [...counts.entries()]
    .map(([title, count]) => ({ title, count }))
    .sort((a, b) => a.title.localeCompare(b.title, "uk"));

  return others > 0 ? [...named, { title: UNCATEGORIZED_CATEGORY_TITLE, count: others }] : named;
}
