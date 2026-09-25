/**
 * Товар і замовлення — те, як вони лежать у базі й їдуть у клієнт.
 *
 * **Товар — окремий рядок, а не сторінка.** Рядок `scenarios` — це сторінка:
 * `page_data` плюс подання в боті. Каталог на триста позицій роздув би
 * таблицю, у якій кожен рядок несе бота, і зробив би «сторінки» й «товари»
 * нерозрізнюваними. Товар не має ані подання в боті, ані власного хвоста
 * параметрів — адресу йому дає магазин (`docs/SHOPS.md` §3).
 *
 * **Позиція замовлення — знімок, а не посилання.** Назва, ціна й вид
 * копіюються на момент замовлення: правка ціни заднім числом переписувала б
 * історію, а видалений товар зникав би із замовлення, яке вже прийняли.
 * `productId` лишається поруч — щоб знайти, про що було, коли товар ще є.
 *
 * @module @wwwuabot/shared/shop
 */

import type { ProductKind } from "./kinds";
import type { MediaKind } from "./media";
import type { OrderStatus } from "./statuses";

/** Характеристика товару: пара «назва — значення», як її бачить покупець. */
export interface ProductAttribute {
  name: string;
  value: string;
}

/** Товар магазину, як він лежить у базі. */
export interface ShopProduct {
  id: number;
  /** Магазин — номер рядка `scenarios`: адреси в товару своєї немає. */
  shopId: number;
  /** Адреса **в межах магазину**: `UNIQUE (shop_id, slug)`. */
  slug: string;
  kind: ProductKind;
  title: string;
  summary: string;
  description: string;
  /** Ціна текстом: «договірна», «2 000 ₴», «за домовленістю». */
  price: string;
  /** Номери файлів `shop_media` у порядку показу; перший — головний. */
  images: number[];
  attributes: ProductAttribute[];
  /** `false` — чернетка: видно продавцю, немає в каталозі. */
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Те, що надсилає форма: без `id` — новий, з `id` — правка свого. */
export interface ProductDraft {
  id?: number;
  kind: ProductKind;
  title: string;
  summary: string;
  description: string;
  price: string;
  address: string;
  images: number[];
  attributes: ProductAttribute[];
  isActive?: boolean;
}

/**
 * Завантажений файл магазину, як він лежить у рядку `shop_media`.
 *
 * Тут **ключ R2, а не адреса**: адреса змінилася б разом із шлюзом, а ключ
 * лишається, і з нього її будує читання (`mediaUrl`). `bytes` і `mime` лежать
 * поруч, бо за ними файл прибирають і показують.
 */
export interface ShopMedia {
  id: number;
  shopId: number;
  key: string;
  mime: string;
  bytes: number;
  kind: MediaKind;
  createdAt: string;
}

/** Контакт покупця: набір полів залежить від виду товару (`orders.ts`). */
export type OrderContact = Readonly<Record<string, string>>;

/** Знімок позиції: назва, ціна й вид — на момент замовлення. */
export interface OrderItem {
  productId: number | null;
  title: string;
  price: string;
  /** Вид товару знімком: невідомий пізніше вид читається як є. */
  kind: string;
  qty: number;
}

/** Замовлення магазину разом із позиціями. */
export interface ShopOrder {
  id: number;
  shopId: number;
  /** Telegram-id покупця: ідентичність із **підписаного** `initData`. */
  buyerId: number;
  /** Ключ статусу (`new`, `done`, …), а не підпис: підпис — слово магазину. */
  status: string;
  contact: OrderContact;
  note: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Відповідь `GET /api/user/shop/products`: товари свого магазину (і чернетки).
 *
 * Разом із товарами їдуть **рядки файлів** — галерея товару тримає номери, а
 * адресу з них будує клієнт (`mediaUrl`). Один список на відповідь, а не запит
 * на кожне фото: каталог на двадцять позицій інакше зробив би двадцять запитів.
 */
export interface ProductListResponse {
  ok: boolean;
  products: ShopProduct[];
  media: ShopMedia[];
}

/** Відповідь `POST /api/user/shop/products`: збережений товар. */
export interface ProductSaveResponse {
  ok: boolean;
  product: ShopProduct | null;
  /** Файли, потрібні цьому товару, — щоб клієнт одразу показав фото. */
  media: ShopMedia[];
  error?: string;
}

/** Відповідь `DELETE /api/user/shop/products`: прибраний товар. */
export interface ProductDeleteResponse {
  ok: boolean;
  id: number;
  error?: string;
}

/** Відповідь `GET /api/space/shop/products`: каталог магазину — лише показане. */
export interface CatalogResponse {
  ok: boolean;
  products: ShopProduct[];
  /** Лише ті файли, які справді стоять у товарах: чужої бібліотеки назовні немає. */
  media: ShopMedia[];
}

/** Відповідь `GET /api/user/shop/media`: власна бібліотека файлів магазину. */
export interface MediaListResponse {
  ok: boolean;
  media: ShopMedia[];
}

/** Відповідь `POST /api/user/shop/media`: прийнятий файл. */
export interface MediaSaveResponse {
  ok: boolean;
  media: ShopMedia | null;
  error?: string;
}

/** Відповідь `DELETE /api/user/shop/media`: прибраний файл. */
export interface MediaDeleteResponse {
  ok: boolean;
  id: number;
  error?: string;
}

/** Відповідь `GET /api/user/shop/orders`: замовлення магазину або свої покупки. */
export interface OrderListResponse {
  ok: boolean;
  orders: ShopOrder[];
  error?: string;
}

/** Відповідь `POST`: прийняте замовлення (або змінений статус — теж воно). */
export interface OrderSaveResponse {
  ok: boolean;
  order: ShopOrder | null;
  error?: string;
}

/** Відповідь `GET /api/user/shop/statuses`: повний список — типові з правками. */
export interface StatusListResponse {
  ok: boolean;
  statuses: OrderStatus[];
  error?: string;
}
