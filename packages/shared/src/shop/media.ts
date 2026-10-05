/**
 * Файли магазину: байти в R2, облік у рядку, адреса — з ключа.
 *
 * **Файл спершу завантажують, потім приєднують.** Між цими кроками він уже
 * існує, і якщо ніде не записаний — його нічим не прибрати, не порахувати й не
 * перевикористати. Тому кожне завантаження дає рядок `shop_media` (`shop_id`,
 * `r2_key`, `mime`, `bytes`, `kind`), а товар посилається на **номери** рядків,
 * а не на байти (`docs/SHOPS.md` §5).
 *
 * **Ключ містить магазин і випадкову частку.** Магазин — щоб квоту й прибирання
 * можна було порахувати за ним (усі файли лежать під `shop/<id>/`), випадкова
 * частка — щоб адресу не можна було вгадати: файл читає Telegram і веб **без**
 * `initData`, тож єдиний захист тут — невгадуваність.
 *
 * **Адресу будує читання з ключа, а не запис.** У рядку й у товарі лежить ключ
 * (номер), і зміна шлюзу його не чіпає: адреса змінилася б сама, а номер
 * лишився б. Тому `mediaUrl` — функція, а не поле бази.
 *
 * **Правила самого файлу — спільні** (`@wwwuabot/shared/files`): який тип
 * приймати, як його назвати в ключі й як показати розмір. Тут лишається
 * доменне: префікс ключа, адреса шляху й видимість файлу.
 *
 * @module @wwwuabot/shared/shop
 */

import {
  MEDIA_IMAGE_LABELS,
  MEDIA_IMAGE_TYPES,
  MEDIA_MAX_BYTES,
  formatBytes,
  imageTypesLabel,
  isImageMime,
  isSafeMediaKey,
  mediaKeyFor,
  mediaRandomToken,
  safeMediaName,
  validateImageUpload,
} from "../files/media";

/**
 * Що це за файл для потоку замовлення.
 *
 * `image` — показують (`images` товару), `file` — видають. Перелік закритий із
 * тієї ж причини, що й види товару: за словом мусить стояти код, який його
 * виконує.
 */
export const SHOP_MEDIA_KINDS = ["image", "file"] as const;

export type MediaKind = (typeof SHOP_MEDIA_KINDS)[number];

/**
 * Стеля файлу — спільна з іншими доменами (`MEDIA_MAX_BYTES`).
 *
 * Не «колись вистачить»: файл проходить крізь запит воркера цілком (у пам'ять),
 * а Workers мають власну межу запиту.
 */
export const SHOP_MEDIA_MAX_BYTES = MEDIA_MAX_BYTES;

/** Формати фото магазину — ті самі, що в решті платформи. */
export const SHOP_MEDIA_IMAGE_TYPES = MEDIA_IMAGE_TYPES;

/** Підказка у формі: «JPEG, PNG, WebP, AVIF або GIF». */
export const SHOP_MEDIA_IMAGE_LABELS = MEDIA_IMAGE_LABELS;

/** «JPEG, PNG, WebP, AVIF або GIF» — те, що читає людина у формі. */
export { formatBytes, imageTypesLabel, isImageMime, mediaRandomToken, safeMediaName };

/**
 * Префікс адреси файлу.
 *
 * Файл віддає `api-dev` — єдиний шлюз: публічний доступ у бакета вимкнено
 * навмисно, інакше адрес стало б дві, а правило «звідки береться файл» — два.
 */
export const SHOP_MEDIA_URL_PREFIX = "/api/shop/media/";

/** Адреса файлу з його ключа — те, що ставлять у розмітку. */
export function mediaUrl(key: string): string {
  return `${SHOP_MEDIA_URL_PREFIX}${key}`;
}

/** Вид файлу з його MIME: невідоме — не картинка, а файл. */
export function mediaKindForMime(mime: unknown): MediaKind {
  return isImageMime(mime) ? "image" : "file";
}

/** Ключ нового файлу: `shop/<номер магазину>/<випадкове>-<ім'я>`. */
export function mediaKey(shopId: number, fileName: unknown, token: string): string {
  return mediaKeyFor("shop", shopId, fileName, token);
}

/**
 * Чи це наш ключ — тобто чи його взагалі можна питати в бакета.
 *
 * Читає файл публічний шлях, тому перевірка форми ключа спільна з іншими
 * доменами: без неї `GET /api/shop/media/../../…` питав би бакета про чуже
 * ім'я, а не про наш ключ.
 */
export function isShopMediaKey(key: unknown): boolean {
  return isSafeMediaKey(key, "shop/");
}

/** Результат перевірки завантаження: `true` — можна писати в R2. */
export type MediaUploadCheck = { ok: true; kind: MediaKind } | { ok: false; message: string };

/**
 * Перевірка завантаження за тим, що видно **до** читання байтів.
 *
 * Магазин приймає фото: `kind` залишився в результаті, бо вид файлу — це те, що
 * показують (`images` товару) і що віддають замовнику, і він мусить бути в
 * рядку обліку, а не виводитися з MIME щоразу на показі.
 */
export function validateMediaUpload(raw: { mime?: unknown; bytes?: unknown }): MediaUploadCheck {
  const checked = validateImageUpload(raw);
  return checked.ok ? { ok: true, kind: "image" } : checked;
}
