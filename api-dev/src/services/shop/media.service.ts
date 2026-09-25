/**
 * Файли магазину: байти в R2, облік у рядку `shop_media`.
 *
 * **Облік обов'язковий, і саме тому він окремий.** Файл спершу завантажують,
 * потім приєднують до товару; між цими кроками він уже існує. Рядок обліку — це
 * єдине місце, де видно, скільки файлів у магазині, чим вони є і коли з'явились
 * (`docs/SHOPS.md` §5). Без нього завантажене нічим не прибрати й не порахувати.
 *
 * **Власник перевіряється до будь-якого запису** (`ownShopId`), і тою самою
 * умовою в запиті: чужий `shop_id` інакше поклав би файл у чужу вітрину, а
 * номер магазину приходить від клієнта.
 *
 * **Порядок видалення — рядок спершу, об'єкт потім.** Об'єкт без рядка невидимий
 * і нічого не ламає; рядок без об'єкта — це бита картинка на сторінці, яку вже
 * нічим не полагодити.
 *
 * @module api-dev/src/services/shop/media.service
 */

import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import {
  isShopMediaKey,
  mediaKey,
  mediaKindForMime,
  mediaRandomToken,
  validateMediaUpload,
  type MediaKind,
  type ShopMedia,
} from "@wwwuabot/shared/shop";
import type { Env } from "../../shared/types";
import { ensureShopSchema, ownShopId } from "./shops";

/** Стеля власної бібліотеки: стільки файлів продавець і не гортає. */
export const MEDIA_LIMIT = 300;
/** Скільки номерів файлів приймає один запит «дай ось ці». */
const MEDIA_IDS_MAX = 400;

/** Колонки читаємо за іменами, а не `SELECT *` (AGENTS.md §7). */
const COLUMNS = "id, shop_id, r2_key, mime, bytes, kind, created_at";

interface MediaRow {
  id: number;
  shop_id: number;
  r2_key: string;
  mime: string | null;
  bytes: number | null;
  kind: string | null;
  created_at: string | null;
}

/**
 * Невідомий вид файлу читається **як є**.
 *
 * Підміна на «схожий» показала б продавцеві не те, що записано, а показ від
 * невідомого значення не ламається: картинку показують за `mime`, не за `kind`.
 */
function toMedia(row: MediaRow): ShopMedia {
  const mime = row.mime ?? "";
  return {
    id: Number(row.id),
    shopId: Number(row.shop_id),
    key: row.r2_key,
    mime,
    bytes: Number(row.bytes ?? 0),
    kind: (row.kind ?? mediaKindForMime(mime)) as MediaKind,
    createdAt: row.created_at ?? "",
  };
}

/**
 * Рядки файлів магазину: або всі (власний список), або лише названі номери.
 *
 * `ids` **без** значення — уся бібліотека: її бачить продавець, щоб поставити
 * те саме фото другому товару. `ids` **із** значенням — рівно вони, і саме так
 * читається каталог: покупцеві не потрібні файли, які не стоять у товарах.
 *
 * Порожній список номерів — не помилка, а «нічого не просили»: запит із
 * порожнім `IN ()` не існує в SQL, тож такий випадок закривається тут.
 */
export async function readShopMedia(
  db: D1Database,
  shopId: number,
  ids?: number[],
): Promise<ShopMedia[]> {
  if (ids && ids.length === 0) return [];

  const named = ids ? ids.slice(0, MEDIA_IDS_MAX) : null;
  const placeholders = named ? ` AND id IN (${named.map(() => "?").join(", ")})` : "";
  const result = await db
    .prepare(
      `SELECT ${COLUMNS} FROM shop_media
        WHERE shop_id = ?${placeholders}
        ORDER BY id DESC LIMIT ?`,
    )
    .bind(shopId, ...(named ?? []), MEDIA_LIMIT)
    .all<MediaRow>();

  return (result.results ?? []).map(toMedia);
}

/** Що сталося із завантаженням: контролер перекладає це в код відповіді. */
export type MediaSaveOutcome =
  | { kind: "saved"; media: ShopMedia }
  | { kind: "not_found" }
  | { kind: "rejected"; message: string }
  | { kind: "unavailable" };

export class ShopMediaService {
  constructor(private env: Env) {}

  /** Бакет може бути не прив'язаний (прод без R2) — тоді це 503, а не виняток. */
  private bucket(): R2Bucket | null {
    return this.env.SHOP_MEDIA ?? null;
  }

  /** Власна бібліотека файлів; `null` — магазин чужий або його немає. */
  async listOwn(shopId: number, ownerId: number): Promise<ShopMedia[] | null> {
    await ensureShopSchema(this.env.DB);
    if ((await ownShopId(this.env.DB, shopId, ownerId)) === null) return null;
    return await readShopMedia(this.env.DB, shopId);
  }

  /**
   * Завантаження: перевірка → байти в R2 → рядок обліку.
   *
   * Порядок саме такий, бо кожен крок може відмовити: тип і розмір
   * перевіряються **до** читання в пам'ять, а рядок пишеться **після** того, як
   * байти лягли в бакет. Рядок без байтів — бите посилання, тому навпаки не
   * можна; байти без рядка (збій на вставці) лишаються невидимими, і це менша
   * з двох бід.
   */
  async upload(shopId: number, ownerId: number, file: File): Promise<MediaSaveOutcome> {
    const bucket = this.bucket();
    if (!bucket) return { kind: "unavailable" };

    const checked = validateMediaUpload({ mime: file.type, bytes: file.size });
    if (!checked.ok) return { kind: "rejected", message: checked.message };

    await ensureShopSchema(this.env.DB);
    if ((await ownShopId(this.env.DB, shopId, ownerId)) === null) return { kind: "not_found" };

    const key = mediaKey(shopId, file.name, mediaRandomToken());
    const bytes = await file.arrayBuffer();

    await bucket.put(key, bytes, {
      httpMetadata: { contentType: file.type },
    });

    const now = formatSqliteDatetime();
    const inserted = await this.env.DB.prepare(
      `INSERT INTO shop_media (shop_id, r2_key, mime, bytes, kind, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(shopId, key, file.type, bytes.byteLength, checked.kind, now)
      .run();

    const media = await this.readRow(shopId, inserted.meta?.last_row_id ?? 0);
    return media ? { kind: "saved", media } : { kind: "not_found" };
  }

  /** Прибирання: рядок обліку, потім об'єкт (див. шапку модуля). */
  async remove(shopId: number, ownerId: number, id: number): Promise<boolean> {
    await ensureShopSchema(this.env.DB);
    if ((await ownShopId(this.env.DB, shopId, ownerId)) === null) return false;

    const row = await this.row(shopId, id);
    if (!row) return false;

    await this.env.DB.prepare("DELETE FROM shop_media WHERE id = ? AND shop_id = ?")
      .bind(id, shopId)
      .run();

    const bucket = this.bucket();
    if (bucket) await bucket.delete(row.r2_key);

    return true;
  }

  /**
   * Байти за ключем — те, що віддають назовні.
   *
   * Ключ приходить із адреси, тож спершу перевіряється його форма
   * (`isShopMediaKey`): без цього `GET /api/shop/media/../../…` питав би бакета
   * про чуже ім'я. Рядок обліку тут **не** читається: файл показують Telegram і
   * веб без `initData`, а адреса невгадувана — зайвий запит до бази на кожне
   * фото нічого не додає до цього рішення.
   */
  async read(key: string): Promise<R2ObjectBody | null> {
    const bucket = this.bucket();
    if (!bucket || !isShopMediaKey(key)) return null;
    return await bucket.get(key);
  }

  private async row(shopId: number, id: number): Promise<MediaRow | null> {
    return await this.env.DB.prepare(
      `SELECT ${COLUMNS} FROM shop_media WHERE id = ? AND shop_id = ?`,
    )
      .bind(id, shopId)
      .first<MediaRow>();
  }

  private async readRow(shopId: number, id: number): Promise<ShopMedia | null> {
    const row = await this.row(shopId, id);
    return row ? toMedia(row) : null;
  }
}
