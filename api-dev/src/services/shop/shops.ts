/**
 * Магазин як межа доступу: чий він і чи відкритий назовні.
 *
 * **Магазин — це рядок `scenarios`, а не окрема таблиця.** `id` — номер
 * магазину (на нього дивляться товари й замовлення), `owner_id` — продавець,
 * `is_public` — видимість, `slug` — адреса. Друга таблиця дала б другу
 * ідентичність магазину й друге правило «яка сторінка для цього URL»
 * (`AGENTS.md` §7, `docs/SHOPS.md` §1).
 *
 * **Власник стоїть у самому запиті** (`WHERE owner_id = ?`), а не окремою
 * перевіркою «а це моє?»: перевірку легко забути на новому шляху, а умову в
 * `WHERE` — ні. Тому «немає» й «чуже» тут нерозрізненні — і це навмисно:
 * контролер віддає на обидва ту саму 404 (код відповіді теж витік).
 *
 * @module api-dev/src/services/shop/shops
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";

/** Магазин, який дивиться сторонній: номер, адреса, продавець і підпис. */
export interface ShopScope {
  id: number;
  slug: string;
  ownerId: number;
  title: string;
}

/**
 * Таблиці магазину — усі шість разом.
 *
 * `scenarios` тут тому, що без неї товар не має до чого прив'язатись: номер
 * магазину береться з неї, а власник таблиці — той самий (`api-dev`).
 */
export async function ensureShopSchema(db: D1Database): Promise<void> {
  await ensureTables(db, [
    "scenarios",
    "shop_products",
    "shop_media",
    "shop_orders",
    "shop_order_items",
    "shop_order_statuses",
  ]);
}

/** Номер свого магазину; `null` — рядка немає або він чужий (однакова відповідь). */
export async function ownShopId(
  db: D1Database,
  shopId: number,
  ownerId: number,
): Promise<number | null> {
  const row = await db
    .prepare("SELECT id FROM scenarios WHERE id = ? AND owner_id = ?")
    .bind(shopId, ownerId)
    .first<{ id: number }>();

  return row ? Number(row.id) : null;
}

/**
 * Відкритий магазин за адресою — те, що бачить покупець.
 *
 * Три умови, і кожна щось відсікає: `is_public` — вибір продавця, `owner_id
 * NOT NULL` — контент платформи (він не «чужий магазин»), `is_active` —
 * вимкнена сторінка, а `is_blocked` прибирає людей, яких платформа
 * заблокувала: це рішення про людину, і жоден її прапорець його не скасовує.
 * Приватний магазин не дістається ні списком, ні товаром — та сама межа, що у
 * сторінок (`docs/SPACE.md`).
 *
 * `COALESCE(is_public, 0)` — не перестраховка: колонку додано наявній таблиці,
 * тож у рядків платформи там `NULL`, і просте `is_public = 1` мовчки
 * відкинуло б усе.
 */
export async function publicShopBySlug(db: D1Database, slug: string): Promise<ShopScope | null> {
  const row = await db
    .prepare(
      `SELECT s.id, s.slug, s.title, s.owner_id
         FROM scenarios s
         JOIN users u ON u.user_id = s.owner_id
        WHERE s.slug = ?
          AND s.owner_id IS NOT NULL
          AND COALESCE(s.is_public, 0) = 1
          AND s.is_active = 1
          AND COALESCE(u.is_blocked, 0) = 0`,
    )
    .bind(slug)
    .first<Record<string, unknown>>();

  return row
    ? {
        id: Number(row.id),
        slug: String(row.slug ?? ""),
        ownerId: Number(row.owner_id),
        title: (row.title as string) ?? "",
      }
    : null;
}
