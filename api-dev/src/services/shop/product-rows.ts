/**
 * Товар як **рядок бази**: колонки, переклад і добір за номерами.
 *
 * **Навіщо окремо.** `products.service.ts` — це правила товару (адреса в межах
 * магазину, чернетка, каталог), і коли поруч із ними живуть назви колонок і
 * переклад рядка, файл переростає межу, за якою його ніхто не читає цілком
 * (`AGENTS.md` §3). Поділ проходить по межі «рядок ↔ факт»: тут усе, що знає про
 * `snake_case`, а сервіс працює з `ShopProduct`.
 *
 * **Колонки читаємо за іменами, а не `SELECT *`** (`AGENTS.md` §7). Список тут
 * один на всіх, хто читає товар: прийом замовлення бере з нього ціну, назву й
 * вид, і другий набір колонок зробив би друге подання товару.
 *
 * **Добір за номерами — з прапорцем, а імена в обгорток.** Покупець питає «що
 * мені покажуть» (`activeProductsByIds`), продавець — «що я вже продав»
 * (`ownProductsByIds`): одне ім'я з `boolean` змусило б читача щоразу згадувати,
 * який бік `true`.
 *
 * @module api-dev/src/services/shop/product-rows
 */

import {
  cleanImageIds,
  isProductKind,
  sanitizeProductAttributes,
  type ProductKind,
  type ShopProduct,
} from "@wwwuabot/shared/shop";
import { readJsonColumn } from "./json";

export const PRODUCT_COLUMNS =
  "id, shop_id, slug, kind, title, category, summary, description, price, images, attributes, is_active, created_at, updated_at";

export interface ProductRow {
  id: number;
  shop_id: number;
  slug: string;
  kind: string;
  title: string | null;
  /**
   * Колонка додана наявній таблиці, тож у старих рядків вона `NULL`, а не `''`.
   * Читач приймає обидва (`?? ""`) — це не перестраховка, а вимога
   * `ensureTables`.
   */
  category: string | null;
  summary: string | null;
  description: string | null;
  price: string | null;
  images: string | null;
  attributes: string | null;
  is_active: number | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Вид товару з рядка: невідоме значення лишається **як є**.
 *
 * Показ його не ламає (`productKindLabel` віддає саме слово), а підміна на
 * «схожий» показала б продавцеві не те, що він записав. Записати чужий вид
 * неможливо — це вже перевірив `validateProductDraft`.
 */
function kindOf(raw: unknown): ProductKind {
  return (isProductKind(raw) ? raw : String(raw ?? "")) as ProductKind;
}

/**
 * Рядок товару → товар, як його читає решта коду.
 *
 * Експортовано з тієї ж причини, що й колонки: цим перекладом користується
 * прийом замовлення, а другий переклад зробив би знімок позиції схожим на
 * товар, а не однаковим із ним.
 */
export function toProduct(row: ProductRow): ShopProduct {
  return {
    id: Number(row.id),
    shopId: Number(row.shop_id),
    slug: row.slug,
    kind: kindOf(row.kind),
    title: row.title ?? "",
    category: row.category ?? "",
    summary: row.summary ?? "",
    description: row.description ?? "",
    price: row.price ?? "",
    images: cleanImageIds(readJsonColumn(row.images)),
    attributes: sanitizeProductAttributes(readJsonColumn(row.attributes)),
    // Колонка має `NOT NULL DEFAULT 1`, але читач не має права покладатись на
    // це: `DEFAULT` діє на нові рядки, а не на ті, що вже лежать у базі.
    isActive: Number(row.is_active ?? 1) === 1,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

/** Той самий запит, а видимість задає прапорець (див. обгортки нижче). */
async function productsByIds(
  db: D1Database,
  shopId: number,
  ids: readonly number[],
  onlyActive: boolean,
): Promise<ShopProduct[]> {
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(", ");
  const result = await db
    .prepare(
      `SELECT ${PRODUCT_COLUMNS} FROM shop_products
        WHERE shop_id = ?${onlyActive ? " AND is_active = 1" : ""}
          AND id IN (${placeholders})`,
    )
    .bind(shopId, ...ids)
    .all<ProductRow>();

  return (result.results ?? []).map(toProduct);
}

/**
 * Показані товари магазину за номерами — те, з чого покупцеві складають знімок.
 *
 * Чернетка сюди не проходить, і це не дрібниця: нею можна було б замовити те,
 * чого магазин ще не показував (`docs/SHOPS.md` §3).
 */
export async function activeProductsByIds(
  db: D1Database,
  shopId: number,
  ids: readonly number[],
): Promise<ShopProduct[]> {
  return await productsByIds(db, shopId, ids, true);
}

/**
 * Товари магазину за номерами **разом із чернетками** — для правки замовлення.
 *
 * Продавець править **уже прийняте** замовлення: він міг прибрати товар із
 * каталогу після продажу, і відмовити йому в позиції з цієї причини означало б
 * заборонити дописати те, що людина вже купила. Право на магазин тут не
 * перевіряється: його вже перевірив той, хто кличе (`managedShopId` у
 * замовленнях), і друга така ж перевірка була б другою відповіддю на те саме
 * питання.
 */
export async function ownProductsByIds(
  db: D1Database,
  shopId: number,
  ids: readonly number[],
): Promise<ShopProduct[]> {
  return await productsByIds(db, shopId, ids, false);
}
