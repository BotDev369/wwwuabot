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
 * **Створення, яке не вміщується в поверхню, — це адреса, а не намір.**
 * Сторінки з шаблону створюють на **власному екрані** (`/pages/new`), і кроків
 * там три: вибір (`/pages/new`) → **перегляд шаблону цілком**
 * (`/pages/new?preview=card`) → текст (`/pages/new?template=card`). Обидва
 * параметри тримають **крок**, тож «назад» веде на попередній, а не виводить зі
 * створення: це той самий механізм «крок в адресі», що й `?new=1`.
 *
 * Два параметри, а не один, бо між переглядом і вибором стоїть **дія людини**
 * («Обрати шаблон») — і саме вона, а не дотик до рядка, означає, що шаблон
 * обрано. `?preview=` тому зникає разом із появою `?template=` (`withPageTemplate`).
 *
 * @module web-platform-dev/src/app/routes
 */

import { isPageTemplateKey, type PageTemplateKey } from "@wwwuabot/shared/pages";

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
 * Тема — **сторінки**, а не поверхня: у теми є історія, адреса й «назад», а в
 * модалки не було жодного з трьох (людина не могла ні повернутись до теми
 * посиланням, ні побачити її у списку). Розділи: стиль, готові теми,
 * налаштування — склад і шляхи дає `pages/themes/theme-sections.ts`, а джерела
 * тем (платформа, свої, з простору) діляться вкладками — `presets-tabs.ts`.
 */
export const THEME_ROUTE = "theme";
export const THEME_PATH = `${PROFILE_PATH}/${THEME_ROUTE}`;

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

/**
 * Гра в Просторі — окрема адреса під своїм сегментом.
 *
 * `g`, а не `games`: сегмент мусить бути коротким і не збігатися з назвою
 * вкладки, бо вкладка — це `?tab=games`, і два різні місця з тим самим словом
 * змушували б вгадувати, котре з них адреса списку, а котре — партії.
 *
 * Адреса тут, а не в базі: гра — не сторінка контенту (`slug`), а власний
 * екран зі своїм станом (AGENTS.md §7). Складає її `gamePath()` у списку
 * ігор — там же лежать і ключі.
 */
export const SPACE_GAME_ROUTE = "g";
export const SPACE_GAME_PATH = `${SPACE_PATH}/${SPACE_GAME_ROUTE}`;

/**
 * Сторінки — власні сторінки людини: ті самі рядки `scenarios`, але з
 * власником (`owner_id`).
 *
 * Адреса тут, а не в базі, бо це **список** входів у власні сторінки, а не
 * сторінка: сам контент відкривається за своїм `slug` (`/slug`) і рендериться
 * тим самим `PageRenderer`, а список і перегляд — екрани платформи. Вигадати під
 * них `slug` означало б завести друге правило «яка адреса відповідає цьому
 * екрану» (AGENTS.md §7).
 */
export const PAGES_ROUTE = "pages";
export const PAGES_PATH = `/${PAGES_ROUTE}`;

/** Своя сторінка окремо: за рядком списку стоїть одна сторінка. */
export const userPagePath = (id: number): string => `${PAGES_PATH}/${id}`;

/**
 * Створення сторінки — **екран**, а не поверхня.
 *
 * У сторінки з шаблону є крок, якого не вміє модалка: спершу шаблон **бачать**
 * (він же й обирається очима), і лише потім правлять текст. Обидва кроки — це
 * сторінка з історією, адресою й «назад»; форма з підписами полів заміняла
 * перегляд уявою.
 *
 * `new` стоїть **під** `/pages`, а не окремим верхнім сегментом: сторінка
 * людини не може мати адресу `pages` (`RESERVED_PAGE_SLUGS`), тож вибір нового
 * сегмента нічого не коштував би — але тоді «створити» стояло б поруч зі
 * списком, як чужий розділ (`AGENTS.md` §7).
 */
export const PAGES_NEW_ROUTE = "new";
export const PAGES_NEW_PATH = `${PAGES_PATH}/${PAGES_NEW_ROUTE}`;

/**
 * Редактор уже наявної сторінки — теж екран.
 *
 * Правка — не перегляд: вона завжди про конкретний рядок, і адреса про це
 * каже (`/pages/7/edit`). Через це «назад» із редактора вертає на перегляд,
 * а не в список, і посилання на редактор можна надіслати.
 */
export const PAGE_EDIT_ROUTE = "edit";
export const userPageEditPath = (id: number): string => `${userPagePath(id)}/${PAGE_EDIT_ROUTE}`;

/**
 * Товари магазину — **під сторінкою**, а не окремим розділом.
 *
 * Магазин — це рядок `scenarios` зі своєю адресою, а товари належать йому
 * (`shop_id`), тож і адреса їхня стоїть під своєю сторінкою: `/pages/7/products`.
 * Окремий розділ `/shop` зробив би другу навігацію по тому самому контенту
 * (`AGENTS.md` §7) і змусив би вибирати магазин там, де його й так видно.
 *
 * `products` під `:id` не збивається з `edit` і `new`: це різні сегменти на
 * одному місці, і сторінка людини не може мати адреси `pages`.
 */
export const SHOP_PRODUCTS_ROUTE = "products";
export const shopProductsPath = (pageId: number): string =>
  `${userPagePath(pageId)}/${SHOP_PRODUCTS_ROUTE}`;

/** Новий товар — **окрема адреса**: у форми є «назад», історія й посилання. */
export const shopProductNewPath = (pageId: number): string => `${shopProductsPath(pageId)}/new`;

/** Правка товару: за адресою стоїть один рядок `shop_products`. */
export const shopProductEditPath = (pageId: number, productId: number): string =>
  `${shopProductsPath(pageId)}/${productId}`;

/**
 * Замовлення магазину — там само, де товари, і з тієї ж причини.
 *
 * `shop_orders` належить тому самому рядку `scenarios`, тож адреса стоїть під
 * його сторінкою: `/pages/7/orders`. Окремий розділ `/shop` зробив би другу
 * навігацію по тому самому контенту (`AGENTS.md` §7).
 *
 * Сегмент свій, а не вкладка в товарах: замовлення — це **робота з людиною**, а
 * товари — каталог, і змішуються вони лише в одному випадку: коли магазин
 * зовсім порожній.
 */
export const SHOP_ORDERS_ROUTE = "orders";
export const shopOrdersPath = (pageId: number): string =>
  `${userPagePath(pageId)}/${SHOP_ORDERS_ROUTE}`;

/**
 * Параметр адреси: `/pages/new?preview=event` — «покажи, як це виглядає».
 *
 * Це крок **перед** вибором, і він потрібен саме тому, що шаблон обирають
 * очима: доки сторінку не видно **всією**, вибір — угадування за описом
 * (`docs/PAGES.md`). Тому список шаблонів веде сюди, а не одразу в текст.
 */
export const PAGE_PREVIEW_PARAM = "preview";

/** Параметр адреси: `/pages/new?template=event` — «шаблон обрано, правлю текст». */
export const PAGE_TEMPLATE_PARAM = "template";

/**
 * Шаблон, який просять **показати** — ще не обраний, лише відкритий на огляд.
 *
 * Невідомий ключ — «перегляду не було»: адресу могли написати руками, а екран
 * перегляду без шаблону показав би порожнє місце.
 */
export function readPagePreview(params: URLSearchParams): PageTemplateKey | null {
  const raw = params.get(PAGE_PREVIEW_PARAM);
  return isPageTemplateKey(raw) ? raw : null;
}

/**
 * Та сама адреса, але з відкритим на огляд шаблоном — **новий запис історії**,
 * тож «назад» вертає до списку шаблонів.
 *
 * `template` знімається: два кроки в одній адресі не мають стояти разом, бо
 * екран вибрав би за старшинством, і «назад» із тексту вів би не туди, звідки
 * людина прийшла.
 */
export function withPagePreview(path: string, key: PageTemplateKey): string {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete(PAGE_TEMPLATE_PARAM);
  params.set(PAGE_PREVIEW_PARAM, key);
  return `${base}?${params.toString()}`;
}

/**
 * Шаблон, з якого людина вже обрала (тобто крок перегляду пройдено).
 *
 * Невідомий ключ читається як «вибору ще не було»: адресу могли написати
 * руками, і показати за нею порожній редактор означало б віддати людину в
 * глухий кут замість вибору шаблону.
 */
export function readPageTemplate(params: URLSearchParams): PageTemplateKey | null {
  const raw = params.get(PAGE_TEMPLATE_PARAM);
  return isPageTemplateKey(raw) ? raw : null;
}

/**
 * Та сама адреса з **обраним** шаблоном — новий запис історії, тож «назад»
 * вертає на перегляд шаблону.
 *
 * `preview` знімається тут навмисно: обравши шаблон, людина переходить до
 * тексту, і адреса з обома кроками показувала б перегляд старішого ключа, якби
 * ключі розійшлися (напр. посиланням).
 */
export function withPageTemplate(path: string, key: PageTemplateKey): string {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete(PAGE_PREVIEW_PARAM);
  params.set(PAGE_TEMPLATE_PARAM, key);
  return `${base}?${params.toString()}`;
}

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
