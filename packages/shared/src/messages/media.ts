/**
 * Фото в листуванні: ключ у сховищі, адреса з ключа, межі завантаження.
 * Патерн той самий, що в файлах магазину: фото завантажують **до** надсилання,
 * тож між кроками воно вже існує — без обліку (`message_media`) його неможливо
 * прибрати й приєднати (`docs/SURFACES.md`).
 *
 * @module @wwwuabot/shared/messages
 */

import { isSafeMediaKey, mediaKeyFor } from "../files/media";

/** Простір ключів файлів листування в спільному бакеті (без слеша). */
const MESSAGE_MEDIA_SCOPE = "msg";

/** Префікс ключа — з ним порівнюється ключ, що прийшов з адреси. */
export const MESSAGE_MEDIA_KEY_PREFIX = `${MESSAGE_MEDIA_SCOPE}/`;

/**
 * Адреса файлу віддає `api-dev` — єдиний шлюз.
 *
 * Публічний доступ у бакет вимкнено навмисно: інакше адрес стало б дві, а
 * правило «звідки береться файл» — два.
 */
export const MESSAGE_MEDIA_URL_PREFIX = "/api/messages/media/";

/** Адреса файлу з його ключа — те, що ставлять у `<img src>`. */
export function messageMediaUrl(key: string): string {
  return `${MESSAGE_MEDIA_URL_PREFIX}${key}`;
}

/**
 * Ключ нового файлу: `msg/<людина>/<випадкове>-<ім'я>`.
 *
 * Людина в ключі — щоб квоту й прибирання рахувати за нею, випадкова частина —
 * щоб адресу не можна було вгадати (файл читають без `initData`).
 */
export function messageMediaKey(ownerId: number, fileName: unknown, token: string): string {
  return mediaKeyFor(MESSAGE_MEDIA_SCOPE, ownerId, fileName, token);
}

/**
 * Чи це наш ключ — тобто чи його взагалі можна питати в сховище.
 *
 * Файл читає публічний шлях, тому форму ключа перевіряємо **тут**, до запиту:
 * інакше `GET /api/messages/media/../../…` питав би бакет про чуже ім'я.
 */
export function isMessageMediaKey(key: unknown): boolean {
  return isSafeMediaKey(key, MESSAGE_MEDIA_KEY_PREFIX);
}

/**
 * Скільки файлів одна людина тримає в листуванні.
 *
 * Файл, який завантажили й **не** надіслали, лишається в сховищі: прибирати
 * його нема з кого — надсилання не відбулося, а рядок обліку є. Тож межа
 * стримує такий бездіяльний хвіст.
 */
export const MESSAGE_MEDIA_PER_USER = 300;

/**
 * Підпис фото там, де немає тексту: у рядку списку розмов і в бульбашці.
 *
 * Одне слово на всі місця, бо це одне й те саме «повідомлення без тексту».
 */
export const MESSAGE_PHOTO_LABEL = "Фото";
