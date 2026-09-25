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
}

/** Ціна так, як її читають. Порожня — «Ціна не вказана», а не порожнє місце. */
export function productPriceLabel(price: string): string {
  return price.trim() || "Ціна не вказана";
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
      };
    });
}
