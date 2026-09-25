/**
 * Товари магазину: власний список і відкритий каталог.
 *
 * **Адреса товару унікальна в межах магазину** (`UNIQUE (shop_id, slug)`), і
 * звідси два різні поводження з зайнятою адресою: при **створенні** вільний
 * варіант шукає `uniqueAddress` (людина не мусить вигадувати адресу — вона її
 * навіть не бачить), а при **правці** зайнята адреса — це відмова: посилання,
 * яке продавець уже десь написав, повело б на інший товар (те саме правило, що
 * в сторінок, `docs/PAGES.md` §3).
 *
 * **Каталог читає те саме сховище, але іншим запитом.** У списку продавця є
 * чернетки (`is_active = 0`), покупцеві — лише те, що показано; і тільки з
 * **відкритого** магазину: приватна сторінка не має товарів назовні, навіть
 * прямим запитом (межа стоїть у запиті до бази, а не в розмітці).
 *
 * @module api-dev/src/services/shop/products.service
 */

import type { Env } from "../../shared/types";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import {
  PRODUCT_SLUG_MAX,
  cleanImageIds,
  isProductKind,
  sanitizeProductAttributes,
  type ProductInput,
  type ProductKind,
  type ShopMedia,
  type ShopProduct,
} from "@wwwuabot/shared/shop";
import { readJsonColumn } from "./json";
import { readShopMedia } from "./media.service";
import { ensureShopSchema, ownShopId, publicShopBySlug } from "./shops";

/** Стеля власного списку: каталог магазину не буває безмежним. */
const OWN_LIMIT = 500;
/** Скільки товарів віддає каталог за раз і яка межа запиту. */
export const CATALOG_PAGE_SIZE = 60;
const CATALOG_PAGE_MAX = 120;

/**
 * Колонки читаємо за іменами, а не `SELECT *` (AGENTS.md §7).
 *
 * Список **експортований**, бо той самий рядок читає прийом замовлення
 * (`orders.service.ts`): замовлення бере з товару ціну, назву й вид — і брати
 * їх іншим набором колонок означало б друге подання товару.
 */
export const PRODUCT_COLUMNS =
  "id, shop_id, slug, kind, title, summary, description, price, images, attributes, is_active, created_at, updated_at";

export interface ProductRow {
  id: number;
  shop_id: number;
  slug: string;
  kind: string;
  title: string | null;
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

/**
 * Товари разом із рядками файлів, на які вони посилаються.
 *
 * Фото в товарі — **номери**, не адреси: адресу з ключа будує клієнт
 * (`mediaUrl`). Тому список файлів їде однією відповіддю: інакше каталог на
 * двадцять позицій зробив би двадцять запитів по ті самі адреси.
 */
export interface ProductsData {
  products: ShopProduct[];
  media: ShopMedia[];
}

/** Що сталося зі збереженням: контролер перекладає це в код відповіді. */
export type ProductSaveOutcome =
  | { kind: "saved"; product: ShopProduct; media: ShopMedia[] }
  | { kind: "not_found" }
  | { kind: "address_taken" };

/** Скільки віддавати за запитом: сміття й перебір дають межі, а не помилку. */
export function clampCatalogLimit(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return CATALOG_PAGE_SIZE;
  return Math.min(Math.floor(value), CATALOG_PAGE_MAX);
}

export class ShopProductsService {
  constructor(private env: Env) {}

  /**
   * Власні товари — разом із чернетками: продавець має їх бачити.
   *
   * Файли тут — **уся** бібліотека магазину: саме з неї продавець ставить те
   * саме фото другому товару, і саме тому список не звужується до вживаних.
   */
  async listOwn(shopId: number, ownerId: number): Promise<ProductsData | null> {
    await ensureShopSchema(this.env.DB);
    if ((await ownShopId(this.env.DB, shopId, ownerId)) === null) return null;

    const result = await this.env.DB.prepare(
      `SELECT ${PRODUCT_COLUMNS} FROM shop_products
        WHERE shop_id = ?
        ORDER BY id DESC LIMIT ?`,
    )
      .bind(shopId, OWN_LIMIT)
      .all<ProductRow>();

    return {
      products: (result.results ?? []).map(toProduct),
      media: await readShopMedia(this.env.DB, shopId),
    };
  }

  /**
   * Каталог відкритого магазину за його адресою; `null` — магазин закритий для нас.
   *
   * Файлів тут рівно ті, що стоять у показаних товарах: решта — бібліотека
   * продавця, і назовні їй нема чого робити.
   */
  async catalog(
    shopSlug: string,
    limit: unknown = CATALOG_PAGE_SIZE,
  ): Promise<ProductsData | null> {
    await ensureShopSchema(this.env.DB);

    const shop = await publicShopBySlug(this.env.DB, shopSlug);
    if (!shop) return null;

    const result = await this.env.DB.prepare(
      `SELECT ${PRODUCT_COLUMNS} FROM shop_products
        WHERE shop_id = ? AND is_active = 1
        ORDER BY id DESC LIMIT ?`,
    )
      .bind(shop.id, clampCatalogLimit(limit))
      .all<ProductRow>();

    const products = (result.results ?? []).map(toProduct);
    const imageIds = [...new Set(products.flatMap((product) => product.images))];

    return { products, media: await readShopMedia(this.env.DB, shop.id, imageIds) };
  }

  /**
   * Запис: `id` є — правка свого товару, немає — новий.
   *
   * Номер магазину приходить від клієнта, тож право продавця перевіряє
   * `ownShopId` **до** будь-якого запису: інакше чужий `shop_id` поклав би
   * товар у чужу вітрину (AGENTS.md §7).
   */
  async save(
    shopId: number,
    ownerId: number,
    input: ProductInput,
    id?: number,
  ): Promise<ProductSaveOutcome> {
    await ensureShopSchema(this.env.DB);
    if ((await ownShopId(this.env.DB, shopId, ownerId)) === null) return { kind: "not_found" };

    const now = formatSqliteDatetime();
    const images = JSON.stringify(input.images);
    const attributes = JSON.stringify(input.attributes);
    const active = input.isActive ? 1 : 0;

    if (id !== undefined) {
      const current = await this.row(shopId, id);
      if (!current) return { kind: "not_found" };
      if (current.slug !== input.slug && (await this.slugOwner(shopId, input.slug, id)) !== null) {
        return { kind: "address_taken" };
      }

      await this.env.DB.prepare(
        `UPDATE shop_products
            SET slug = ?, kind = ?, title = ?, summary = ?, description = ?, price = ?,
                images = ?, attributes = ?, is_active = ?, updated_at = ?
          WHERE id = ? AND shop_id = ?`,
      )
        .bind(
          input.slug,
          input.kind,
          input.title,
          input.summary,
          input.description,
          input.price,
          images,
          attributes,
          active,
          now,
          id,
          shopId,
        )
        .run();

      const product = await this.read(shopId, id);
      if (!product) return { kind: "not_found" };
      return {
        kind: "saved",
        product,
        media: await readShopMedia(this.env.DB, shopId, product.images),
      };
    }

    const slug = await this.uniqueSlug(shopId, input.slug);
    const inserted = await this.env.DB.prepare(
      `INSERT INTO shop_products
         (shop_id, slug, kind, title, summary, description, price, images, attributes, is_active,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        shopId,
        slug,
        input.kind,
        input.title,
        input.summary,
        input.description,
        input.price,
        images,
        attributes,
        active,
        now,
        now,
      )
      .run();

    const product = await this.read(shopId, inserted.meta?.last_row_id ?? 0);
    if (!product) return { kind: "not_found" };
    return {
      kind: "saved",
      product,
      media: await readShopMedia(this.env.DB, shopId, product.images),
    };
  }

  /** Видалення свого товару; видалені замовлення не чіпає — там знімок. */
  async remove(shopId: number, ownerId: number, id: number): Promise<boolean> {
    await ensureShopSchema(this.env.DB);
    if ((await ownShopId(this.env.DB, shopId, ownerId)) === null) return false;

    const result = await this.env.DB.prepare(
      "DELETE FROM shop_products WHERE id = ? AND shop_id = ?",
    )
      .bind(id, shopId)
      .run();

    return (result.meta?.changes ?? 0) > 0;
  }

  private async row(shopId: number, id: number): Promise<ProductRow | null> {
    return await this.env.DB.prepare(
      `SELECT ${PRODUCT_COLUMNS} FROM shop_products WHERE id = ? AND shop_id = ?`,
    )
      .bind(id, shopId)
      .first<ProductRow>();
  }

  private async read(shopId: number, id: number): Promise<ShopProduct | null> {
    const row = await this.row(shopId, id);
    return row ? toProduct(row) : null;
  }

  /** Номер товару, який уже зайняв адресу в цьому магазині; `exceptId` — «крім нього». */
  private async slugOwner(shopId: number, slug: string, exceptId?: number): Promise<number | null> {
    const row = await this.env.DB.prepare(
      exceptId === undefined
        ? "SELECT id FROM shop_products WHERE shop_id = ? AND slug = ? LIMIT 1"
        : "SELECT id FROM shop_products WHERE shop_id = ? AND slug = ? AND id <> ? LIMIT 1",
    )
      .bind(...(exceptId === undefined ? [shopId, slug] : [shopId, slug, exceptId]))
      .first<{ id: number }>();

    return row ? Number(row.id) : null;
  }

  /**
   * Вільна адреса нового товару: хвіст додається, доки адреса зайнята.
   *
   * Хвіст **не подовжує** адресу за стелю: обрізаний Telegram-payload веде в
   * нікуди, і дізнатись про це нічим (`isDeepLinkable` перевіряє довжину на
   * побудові, тож адреса мусить лишатись такою, як її склали).
   */
  private async uniqueSlug(shopId: number, base: string): Promise<string> {
    for (let attempt = 1; attempt <= 50; attempt++) {
      const suffix = attempt === 1 ? "" : `-${attempt}`;
      const candidate = `${base.slice(0, PRODUCT_SLUG_MAX - suffix.length)}${suffix}`;
      if ((await this.slugOwner(shopId, candidate)) === null) return candidate;
    }
    return `${base.slice(0, PRODUCT_SLUG_MAX - 6)}-${Date.now() % 100000}`;
  }
}
