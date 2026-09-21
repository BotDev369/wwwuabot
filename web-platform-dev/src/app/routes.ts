/**
 * Адреси екранів платформи — усе, що **не** є рядком контенту.
 *
 * Більшість сторінок платформи — це рядки таблиці `scenarios`: адресу дає
 * `slug`, а шлях будує `toWebPath()` (`packages/shared/src/content`). Інші — а
 * саме профіль (хаб і акаунт), простір, список нотаток, контакти й переписка —
 * не рядки контенту: профіль складається з даних користувача, простір — із
 * відкритих профілів і оголошень, нотатки — з таблиці `notes`, контакти — з
 * `contacts`, переписка — з `conversations`/`messages`, а не з `page_data`.
 * Тому в них власні шляхи, і живуть вони тут, а не в базі (AGENTS.md §7).
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

/** Профіль — хаб: рядок акаунта й розділи платформи. */
export const PROFILE_ROUTE = "profile";
export const PROFILE_PATH = `/${PROFILE_ROUTE}`;

/**
 * Акаунт — сторінка за рядком хабу: окремо платформа (`#ім'я`), окремо
 * Telegram (`@хендл`). Окрема адреса, а не стан хабу: сюди приходять за одним
 * — «подивитись, що в мене є» й змінити ім'я, — і «назад» із неї вертає на
 * хаб, як зі звичайної сторінки.
 */
export const PROFILE_ACCOUNT_ROUTE = "account";
export const PROFILE_ACCOUNT_PATH = `${PROFILE_PATH}/${PROFILE_ACCOUNT_ROUTE}`;

/**
 * Простір — відкрита стрічка платформи: люди, які самі показали свій профіль,
 * а далі оголошення й сторінки.
 *
 * Адреса тут, а не в базі: рядка `scenarios` під Простором немає, бо це не
 * сторінка контенту, а **вибірка** з даних (`users`, `ads`). Вигадувати під
 * нього `slug` означало б завести друге правило «яка адреса відповідає цьому
 * екрану» (AGENTS.md §7).
 */
export const SPACE_ROUTE = "space";
export const SPACE_PATH = `/${SPACE_ROUTE}`;

/** Людина в Просторі — окрема адреса: за карткою стоїть один профіль. */
export const SPACE_USER_ROUTE = "u";
export const SPACE_USER_PATH = `${SPACE_PATH}/${SPACE_USER_ROUTE}`;

/** Шлях профілю людини за її Telegram-id: складає **одна** функція. */
export const spaceUserPath = (id: number): string => `${SPACE_USER_PATH}/${id}`;

/** Нотатки — власні дані людини, не рядок `scenarios`. */
export const NOTES_ROUTE = "notes";
export const NOTES_PATH = `/${NOTES_ROUTE}`;

/** Контакти — довідник людини, теж не рядок контенту. */
export const CONTACTS_ROUTE = "contacts";
export const CONTACTS_PATH = `/${CONTACTS_ROUTE}`;
