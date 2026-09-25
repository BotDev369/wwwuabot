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
 * @module @wwwuabot/shared/shop
 */

import { transliterateSlug } from "../content/slugify";

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
 * Стеля файлу — 8 МБ.
 *
 * Не «колись вистачить»: файл проходить крізь запит воркера цілком (у пам'ять),
 * а Workers мають власну межу запиту. Межа стоїть **до** читання в пам'ять —
 * завантаження, яке все одно не пройде, не має коштувати пам'яті.
 */
export const SHOP_MEDIA_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Що можна завантажити фотографією.
 *
 * Перелік закритий: `image/svg+xml` тут **немає** навмисно — SVG це документ із
 * скриптами, і показувати його як фото означало б виконувати чужий код у
 * контексті сторінки.
 */
export const SHOP_MEDIA_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

/**
 * Ті самі типи, але так, як їх називають людині: підказка у формі.
 *
 * Список стоїть **поруч** із `SHOP_MEDIA_IMAGE_TYPES` і мусить мати ту саму
 * довжину — стежить тест: підказка, яка обіцяє не той формат, гірша за
 * відсутню.
 */
export const SHOP_MEDIA_IMAGE_LABELS = ["JPEG", "PNG", "WebP", "AVIF", "GIF"] as const;

/** «JPEG, PNG, WebP, AVIF або GIF» — те, що читає людина у формі. */
export function imageTypesLabel(): string {
  const all = [...SHOP_MEDIA_IMAGE_LABELS];
  const last = all.pop() ?? "";
  return `${all.join(", ")} або ${last}`;
}

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

/** Чи їде цей MIME як картинка (без параметрів на кшталт `; charset=`). */
export function isImageMime(mime: unknown): boolean {
  if (typeof mime !== "string") return false;
  return (SHOP_MEDIA_IMAGE_TYPES as readonly string[]).includes(mime.split(";")[0].trim());
}

/** Вид файлу з його MIME: невідоме — не картинка, а файл. */
export function mediaKindForMime(mime: unknown): MediaKind {
  return isImageMime(mime) ? "image" : "file";
}

/**
 * Ім'я файлу → безпечний хвіст ключа.
 *
 * Розширення лишається: за ним браузер і Telegram вибирають, як показати файл, і
 * без нього `image/jpeg` усе ще працює, а завантажений файл — уже ні.
 * Розширення відділяється **до** перекладу: `transliterateSlug` замінює крапку
 * дефісом, і `.jpg` перетворився б на `-jpg`.
 */
export function safeMediaName(raw: unknown): string {
  const name = typeof raw === "string" ? raw : "";
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const extension =
    dot > 0
      ? name
          .slice(dot + 1)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
          .slice(0, 5)
      : "";

  const base = transliterateSlug(stem, 48) || "file";
  return extension ? `${base}.${extension}` : base;
}

/** Випадкова частка ключа, шість байтів шістнадцятковим рядком. */
export function mediaRandomToken(bytes = 6): string {
  const data = new Uint8Array(bytes);
  crypto.getRandomValues(data);
  return [...data].map((value) => value.toString(16).padStart(2, "0")).join("");
}

/** Ключ нового файлу: `shop/<номер магазину>/<випадкове>-<ім'я>`. */
export function mediaKey(shopId: number, fileName: unknown, token: string): string {
  return `shop/${shopId}/${token}-${safeMediaName(fileName)}`;
}

/**
 * Чи це наш ключ — тобто чи його взагалі можна питати в бакета.
 *
 * Читає файл публічний шлях, і в ключі не має бути ні виходу вгору (`..`), ні
 * зворотного слеша: без цієї перевірки `GET /api/shop/media/../../…` питав би
 * бакета про чуже ім'я, а не про наш ключ.
 */
export function isShopMediaKey(key: unknown): boolean {
  return (
    typeof key === "string" &&
    key.startsWith("shop/") &&
    key.length > "shop/".length &&
    !key.includes("..") &&
    !key.includes("\\") &&
    key.length <= 512
  );
}

/** Результат перевірки завантаження: `true` — можна писати в R2. */
export type MediaUploadCheck = { ok: true; kind: MediaKind } | { ok: false; message: string };

/**
 * Перевірка завантаження за тим, що видно **до** читання байтів.
 *
 * Межа й тип перевіряються за метаданими (`type`, `size`), а не за вмістом:
 * вміст уже довелося б читати в пам'ять, а відмова після цього — це та сама
 * робота, що й прийняття. Тому порожній файл і перебір за розміром
 * відсікаються тут, а `mediaKindForMime` потім вирішує, картинка це чи файл.
 */
export function validateMediaUpload(raw: { mime?: unknown; bytes?: unknown }): MediaUploadCheck {
  const kind = mediaKindForMime(raw.mime);
  if (kind !== "image") {
    return { ok: false, message: "Фото має бути JPEG, PNG, WebP, AVIF або GIF" };
  }

  const bytes = Number(raw.bytes);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return { ok: false, message: "Файл порожній" };
  }
  if (bytes > SHOP_MEDIA_MAX_BYTES) {
    return {
      ok: false,
      message: `Файл більший за ${Math.floor(SHOP_MEDIA_MAX_BYTES / 1024 / 1024)} МБ`,
    };
  }

  return { ok: true, kind };
}

/** Розмір для людини: «840 КБ», «1,4 МБ». */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;
}
