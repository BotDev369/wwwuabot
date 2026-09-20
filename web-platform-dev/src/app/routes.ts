/**
 * Адреси екранів платформи — усе, що **не** є рядком контенту.
 *
 * Більшість сторінок платформи — це рядки таблиці `scenarios`: адресу дає
 * `slug`, а шлях будує `toWebPath()` (`packages/shared/src/content`). Ці
 * чотири — інші: профіль складається з даних користувача, список нотаток — із
 * таблиці `notes`, контакти — з `contacts`, переписка — з
 * `conversations`/`messages`, а не з `page_data`. Тому в них власні шляхи, і
 * живуть вони тут, а не в базі (AGENTS.md §7).
 *
 * Один файл на всі — бо на кожну з цих адрес веде **двоє**: маршрут у
 * `app/router.tsx` і пункт навігації (футер, хаб профілю). Два літерали
 * розійшлися б тихо, і один із них вів би на 404.
 *
 * @module web-platform-dev/src/app/routes
 */

/**
 * Адреса розмови — зі спільного складу (`@wwwuabot/shared/messages`).
 *
 * Ту саму адресу складає бот для кнопки «Відкрити чат» (`messagesPeerPath`),
 * тож у неї один власник на два воркери, а не два літерали.
 */
export { MESSAGES_PATH } from "@wwwuabot/shared/messages";

/** Профіль — хаб: обліковий екран і розділи платформи. */
export const PROFILE_ROUTE = "profile";
export const PROFILE_PATH = `/${PROFILE_ROUTE}`;

/** Нотатки — власні дані людини, не рядок `scenarios`. */
export const NOTES_ROUTE = "notes";
export const NOTES_PATH = `/${NOTES_ROUTE}`;

/** Контакти — довідник людини, теж не рядок контенту. */
export const CONTACTS_ROUTE = "contacts";
export const CONTACTS_PATH = `/${CONTACTS_ROUTE}`;
