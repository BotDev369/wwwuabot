/**
 * Примітиви файлу, які не знають домену: ім'я, ключ, тип, розмір.
 *
 * Правила «який файл прийняти» й «як його назвати» однакові для фото товару й
 * фото в листуванні, тож доменним лишається лише простір ключів і адреса.
 *
 * @module @wwwuabot/shared/files
 */

import { transliterateSlug } from "../content/slugify";

/** Стеля файлу — 8 МБ: файл проходить крізь запит воркера цілком (у пам'ять). */
export const MEDIA_MAX_BYTES = 8 * 1024 * 1024;

/**
 * Що можна завантажити фотографією.
 *
 * Перелік закритий: `image/svg+xml` тут **немає** навмисно — SVG це документ із
 * скриптами, і показувати його як фото означало б виконувати чужий код у
 * контексті сторінки.
 */
export const MEDIA_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
] as const;

/**
 * Ті самі типи, але так, як їх називають людині: підказка у формі.
 *
 * Список стоїть **поруч** із `MEDIA_IMAGE_TYPES` і мусить мати ту саму довжину —
 * стежить тест: підказка, яка обіцяє не той формат, гірша за відсутню.
 */
export const MEDIA_IMAGE_LABELS = ["JPEG", "PNG", "WebP", "AVIF", "GIF"] as const;

/** «JPEG, PNG, WebP, AVIF або GIF» — те, що читає людина у формі. */
export function imageTypesLabel(): string {
  const all = [...MEDIA_IMAGE_LABELS];
  const last = all.pop() ?? "";
  return `${all.join(", ")} або ${last}`;
}

/** Чи їде цей MIME як картинка (без параметрів на кшталт `; charset=`). */
export function isImageMime(mime: unknown): boolean {
  if (typeof mime !== "string") return false;
  return (MEDIA_IMAGE_TYPES as readonly string[]).includes(mime.split(";")[0].trim());
}

/**
 * Ім'я файлу → безпечний хвіст ключа.
 *
 * Розширення лишається: за ним браузер і Telegram вибирають, як показати файл.
 * Воно відділяється **до** перекладу — `transliterateSlug` замінює крапку дефісом,
 * і `.jpg` перетворилося б на `-jpg`.
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

/** Розмір для людини: «840 КБ», «1,4 МБ». */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} Б`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} МБ`;
}

/** Результат перевірки завантаження: `ok: true` — можна писати в сховище. */
export type ImageUploadCheck = { ok: true } | { ok: false; message: string };

/**
 * Перевірка фото за тим, що видно **до** читання байтів.
 *
 * Межа й тип перевіряються за метаданими (`type`, `size`): порожній файл і
 * перебір відсікаються тут, бо відмова після читання — це та сама робота, що й
 * прийняття.
 */
export function validateImageUpload(raw: { mime?: unknown; bytes?: unknown }): ImageUploadCheck {
  if (!isImageMime(raw.mime)) {
    return { ok: false, message: "Фото має бути JPEG, PNG, WebP, AVIF або GIF" };
  }

  const bytes = Number(raw.bytes);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return { ok: false, message: "Файл порожній" };
  }
  if (bytes > MEDIA_MAX_BYTES) {
    return {
      ok: false,
      message: `Файл більший за ${Math.floor(MEDIA_MAX_BYTES / 1024 / 1024)} МБ`,
    };
  }

  return { ok: true };
}

/**
 * Чи це наш ключ — тобто чи його взагалі можна питати в сховище.
 *
 * Ключ приходить з адреси, і в ньому не має бути ні виходу вгору (`..`), ні
 * зворотного слеша: інакше запит питав би сховище про чуже ім'я.
 */
export function isSafeMediaKey(key: unknown, prefix: string): boolean {
  return (
    typeof key === "string" &&
    key.startsWith(prefix) &&
    key.length > prefix.length &&
    !key.includes("..") &&
    !key.includes("\\") &&
    key.length <= 512
  );
}

/**
 * Ключ нового файлу: `<простір>/<власник>/<випадкове>-<ім'я>`.
 *
 * `scope` — без слеша (`shop`, `msg`): слеш додається тут, тож `msg/` і `msg` не
 * дають різних ключів `msg//…`.
 */
export function mediaKeyFor(
  scope: string,
  ownerId: number,
  fileName: unknown,
  token: string,
): string {
  return `${scope.replace(/\/+$/, "")}/${ownerId}/${token}-${safeMediaName(fileName)}`;
}
