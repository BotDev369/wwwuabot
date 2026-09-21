/**
 * Адреси екранів платформи — усе, що **не** є рядком контенту.
 *
 * Більшість сторінок платформи — це рядки таблиці `scenarios`: адресу дає
 * `slug`, а шлях будує `toWebPath()` (`packages/shared/src/content`). Інші — а
 * саме профіль (хаб і акаунт), простір, список нотаток, контакти, переписка й
 * хаб створення — не рядки контенту: профіль складається з даних користувача,
 * простір — із відкритих профілів і оголошень, нотатки — з таблиці `notes`,
 * контакти — з `contacts`, переписка — з `conversations`/`messages`, а хаб
 * створення — це список власних екранів, а не `page_data`. Тому в них власні
 * шляхи, і живуть вони тут, а не в базі (AGENTS.md §7).
 *
 * Один файл на всі — бо на кожну з цих адрес веде **двоє**: маршрут у
 * `app/router.tsx` і пункт навігації (футер, хаб профілю). Два літерали
 * розійшлися б тихо, і один із них вів би на 404.
 *
 * **Намір теж адреса.** Екран, який уміє створювати, відкриває свою форму за
 * `?new=1` (`withCreateIntent`): адреса — це **вхід**, а не стан, тож вона
 * читається один раз, при появі. Хаб «Створити» такої адреси **не складає**:
 * він відкриває форму поверхнею на собі й нікуди не веде (перехід на екран
 * робить окрема кнопка «подивитись»). Це той самий прийом, що з відкриттям
 * розмови (`?peer=`, `@wwwuabot/shared/messages/route`).
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

/**
 * Хаб «Створити» — екран, куди веде «+» у футері.
 *
 * Власна адреса, а не `slug`: це не сторінка, а **список входів** у власні
 * екрани людини (Дати, Контакти, Локації, Нотатки, Оголошення, Повідомлення,
 * Сторінки). Вигадати під нього рядок `scenarios` означало б завести друге
 * правило «яка адреса відповідає цьому екрану» (AGENTS.md §7).
 *
 * Слот футера — дія, але **дією лишається дотик**, а не сама адреса: у хабу є
 * і історія, і «назад», і посилання, яке можна надіслати. Це те саме правило,
 * від якого свого часу переїхав у сторінку «Профіль».
 */
export const CREATE_ROUTE = "create";
export const CREATE_PATH = `/${CREATE_ROUTE}`;

/* ── Намір створити ───────────────────────────────────────────────────────
   Пара «параметр = значення» і чисті функції навколо неї: читає екран, складає
   хаб, знімає форма. Сам рядок живе тут, бо це частина адреси, а не стан. */

/** Параметр адреси: `/notes?new=1` — «відкрий створення одразу». */
export const CREATE_INTENT_PARAM = "new";
export const CREATE_INTENT_VALUE = "1";

/**
 * Чи просять відкрити створення. Правда — одна: **адреса**.
 *
 * Саме тому форма відкривається за адресою, а не за локальним прапорцем: у
 * Telegram Mini App «закрити форму» — це найчастіше «назад» (жест або кнопка
 * системи), а це **зміна адреси**. З локальним станом вона не закривала б форму,
 * а виходила б зі *сторінки*.
 */
export function readCreateIntent(params: URLSearchParams): boolean {
  return params.get(CREATE_INTENT_PARAM) === CREATE_INTENT_VALUE;
}

/**
 * Та сама адреса, але з наміром створити.
 *
 * Розбір через `URLSearchParams`, а не склейка рядка: адреса може вже нести
 * свої параметри (`/space?tab=ads`), і `?` замість `&` зробив би другий
 * параметр частиною першого — тоді замість створення відкривався б список.
 */
export function withCreateIntent(path: string): string {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set(CREATE_INTENT_PARAM, CREATE_INTENT_VALUE);
  return `${base}?${params.toString()}`;
}

/**
 * Та сама адреса **без** наміру — чим лишається екран, коли форму закрито
 * (`/notes?new=1` → `/notes`, `/space?tab=ads&new=1` → `/space?tab=ads`).
 *
 * Прибирається рівно **один** параметр: в адреси можуть бути свої (`tab=ads`), і
 * вони мусять лишитись на місці — інакше замість дошки відкриється стрічка людей.
 */
export function withoutCreateIntent(path: string): string {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete(CREATE_INTENT_PARAM);
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
}

/**
 * Позначка запису, який **відкрив форму**.
 *
 * Нею хаб і екран кажуть одне: під цим записом стоїть сам розділ. Тому
 * закриття форми — **крок назад** (людина лишається в розділі), а не заміна
 * адреси навпростець. Без позначки «назад» повертало б туди, звідки прийшли, а
 * при відкритті за посиланням — узагалі виводило б із продукту.
 */
export const CREATE_FORM_STATE = { createForm: true } as const;

/** Чи це запис форми — тобто чи є під ним розділ, у який вертає закриття. */
export function isCreateFormEntry(state: unknown): boolean {
  if (typeof state !== "object" || state === null) return false;
  return (state as { createForm?: unknown }).createForm === true;
}
