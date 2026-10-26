/**
 * Адреси екранів платформи — усе, що **не** є рядком контенту.
 *
 * Більшість сторінок платформи — це рядки таблиці `scenarios`: адресу дає
 * `slug`, а шлях будує `toWebPath()` (`packages/shared/src/content`). Інші — а
 * саме акаунт, замовлення магазинів, оголошення, ігри, користувачі, список
 * нотаток, контакти й переписка — не рядки контенту: акаунт складається з даних
 * користувача, замовлення — з `shop_orders` під магазинами, оголошення — з
 * `ads`, ігри — з власних екранів, користувачі — з відкритих профілів, нотатки —
 * з таблиці `notes`, контакти — з `contacts`, переписка — з
 * `conversations`/`messages`. Тому в них власні шляхи, і живуть вони тут, а не
 * в базі (AGENTS.md §7).
 *
 * Один файл на всі — бо на кожну з цих адрес веде **двоє**: маршрут у
 * `app/router.tsx` і пункт навігації (футер, список сервісів). Два літерали
 * розійшлися б тихо, і один із них вів би на 404.
 *
 * **Намір теж адреса.** Екран, який уміє створювати, відкриває свою форму за
 * `?new=1` (`withCreateIntent`): адреса — це **вхід**, а не стан, тож вона
 * читається один раз, при появі. Це той самий прийом, що з відкриттям розмови
 * (`?peer=`, `@wwwuabot/shared/messages`).
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

/**
 * Три адреси, які читає ще й бот: рядок кнопок під першим екраном бота веде на
 * **ті самі екрани й у тому ж порядку**, що пункти футера (`screen.ts` у
 * `bot-dev`). Власник у них один — спільний модуль, а не цей файл: два літерали
 * однієї адреси розійшлися б тихо, і кнопка в чаті відкрила б 404.
 */
import { TRACKERS_PATH } from "@wwwuabot/shared/app/routes";

export { ACCOUNT_PATH, FAVORITES_PATH, SERVICES_PATH } from "@wwwuabot/shared/app/routes";
export { TRACKERS_PATH };

export const FAVORITES_ROUTE = "favorites";

/**
 * Акаунт — дані людини: окремо платформа (`#ім'я`), окремо Telegram (`@хендл`).
 *
 * Адреса верхня, а не під хабу: хабу немає, і акаунт — це **сам екран** людини,
 * а не рядок у списку. Тому на нього ж ведуть і корінь продукту, і слот футера.
 */
export const ACCOUNT_ROUTE = "account";

/**
 * Замовлення — робота, яку людина веде, а не сторінка.
 *
 * Магазинів у людини буває кілька, і замовлення лежать під кожним із них
 * (`/pages/7/orders`). Другої реалізації того самого списку тут немає: цей
 * екран каже лише **де** працює людина — власником чи адміном, — і веде до
 * замовлень того магазину. Тому адреса має власний сегмент, а не живе під
 * `/pages`: під сторінкою вже стоять товари й замовлення **однієї** сторінки.
 */
export const ORDERS_ROUTE = "orders";
export const ORDERS_PATH = `/${ORDERS_ROUTE}`;

/**
 * Тема — **меню**, а не сторінки: вибір вигляду живий (кольори й шрифт лягають
 * на екран одразу), тож адреса тут нічого не додає — її нікуди не надіслати й
 * не відкрити з іншого місця. Палітра в хедері відкриває `pages/themes/
 * ThemeMenu`, редактор теми — модалкою поверх нього.
 */

/**
 * Оголошення — дошка, яку наповнюють люди: товари, робота, послуги.
 *
 * Адреса власна, а не `slug`: дошка — **вибірка** з таблиці `ads`, а не рядок
 * контенту. Вигадувати під неї `slug` означало б завести друге правило «яка
 * адреса відповідає цьому екрану» (AGENTS.md §7).
 */
export const ADS_ROUTE = "ads";
export const ADS_PATH = `/${ADS_ROUTE}`;

/**
 * Ігри — власні екрани платформи, без рядка в базі.
 *
 * Список і партія — різні адреси: `/games` відповідає на «у що пограти», а
 * `/games/:key` — на «як воно йде», тож «назад» із партії вертає до списку, а
 * посилання на гру можна надіслати.
 */
export const GAMES_ROUTE = "games";
export const GAMES_PATH = `/${GAMES_ROUTE}`;

/**
 * Користувачі — люди, які самі відкрили свій профіль.
 *
 * Адреса власна: це вибірка з `users`, а не сторінка контенту, і окремої
 * адреси під саму людину тут **немає** — стрічка показує картку, а не веде на
 * другу поверхню (AGENTS.md §7).
 */
export const USERS_ROUTE = "users";
export const USERS_PATH = `/${USERS_ROUTE}`;

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
 * Одне замовлення — **своя адреса**, і це вибір, а не дрібниця.
 *
 * Правка — не перегляд: у неї є «назад» до черги, історія й посилання, яке можна
 * надіслати (`AGENTS.md` §7). Модалка не має жодного з трьох, а власне замовлення
 * з позиціями, контактом і коментарем — це місце, куди людина повертається, тож
 * адреса в нього мусить бути. Сегмент — номер у тому самому `orders`.
 */
export const shopOrderPath = (pageId: number, orderId: number): string =>
  `${shopOrdersPath(pageId)}/${orderId}`;

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

/**
 * Трекери — власні щоденні записи людини, не рядок `scenarios`.
 *
 * Список і один трекер — різні адреси: «назад» із трекера вертає до списку, а
 * посиланням можна дати конкретну мірку. `id` — номер рядка `trackers`.
 */
export const TRACKERS_ROUTE = "trackers";

/** Нотатки — власні дані людини, не рядок `scenarios`. */
export const NOTES_ROUTE = "notes";
export const NOTES_PATH = `/${NOTES_ROUTE}`;

/** Контакти — довідник людини, теж не рядок контенту. */
export const CONTACTS_ROUTE = "contacts";
export const CONTACTS_PATH = `/${CONTACTS_ROUTE}`;

/**
 * Сервіси — список екранів платформи, які вже працюють. Адреса власна, а не
 * `slug`: список входів — не сторінка контенту (AGENTS.md §7).
 *
 * Сам шлях — реекспорт зі спільного модуля вище: він один на платформу й бота
 * (третій пункт футера = третя кнопка під першим екраном). Тут лишається тільки
 * сегмент маршруту.
 */
export const SERVICES_ROUTE = "services";

/**
 * «Розвиток» — самооцінка, власні дані людини, не рядок `scenarios`.
 *
 * **Адреса розділу й адреса проходження — різні речі:** `/assessments`
 * показує список тестів, а `/assessments/:key` — саме проходження. Тому
 * «назад» у Telegram повертає на список, а не виходить із розділу, і
 * посиланням можна дати конкретний тест.
 *
 * Довший шлях мусить стояти **перед** коротшим у роутері, як `:id` у
 * `/pages`: інакше `:key` зʼїсть сам розділ.
 */
export const ASSESSMENTS_ROUTE = "assessments";
export const ASSESSMENTS_PATH = `/${ASSESSMENTS_ROUTE}`;

/** Адреса проходження одного тесту. */
export function assessmentRunPath(key: string): string {
  return `${ASSESSMENTS_PATH}/${key}`;
}

/* ── Намір створити ───────────────────────────────────────────────────────
   Пара «параметр = значення» і чисті функції навколо неї: читає екран, складає
   список, знімає форма. Сам рядок живе тут, бо це частина адреси, а не стан. */

/** Параметр адреси: `/notes?new=1` — «відкрий створення одразу». */
export const CREATE_INTENT_PARAM = "new";
export const CREATE_INTENT_VALUE = "1";
/**
 * Група, у якій створити рядок: `/trackers?new=1&group=12` — «новий трекер
 * у цій групі». Адреса, а не стан: «назад» закриває форму так само.
 */
export const CREATE_GROUP_PARAM = "group";

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
 * свої параметри (`/messages?peer=5`), і `?` замість `&` зробив би другий
 * параметр частиною першого — тоді замість створення відкривався б список.
 */
export function withCreateIntent(path: string, groupId?: number | null): string {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set(CREATE_INTENT_PARAM, CREATE_INTENT_VALUE);
  if (groupId !== undefined && groupId !== null) {
    params.set(CREATE_GROUP_PARAM, String(groupId));
  }
  return `${base}?${params.toString()}`;
}

/** Група з адреси створення; немає або смiття — `null` (людина обере сама). */
export function readCreateGroupId(params: URLSearchParams): number | null {
  const id = Number(params.get(CREATE_GROUP_PARAM));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * Та сама адреса **без** наміру — чим лишається екран, коли форму закрито
 * (`/notes?new=1` → `/notes`, `/messages?peer=5&new=1` → `/messages?peer=5`).
 *
 * Прибирається рівно **один** параметр: в адреси можуть бути свої (`peer=5`), і
 * вони мусять лишитись на місці — інакше закрита форма викидала б із розмови.
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
 * Нею екран каже одне: під цим записом стоїть сам розділ. Тому закриття форми —
 * **крок назад** (людина лишається в розділі), а не заміна адреси навпростець.
 * Без позначки «назад» повертало б туди, звідки прийшли, а при відкритті за
 * посиланням — узагалі виводило б із продукту.
 */
export const CREATE_FORM_STATE = { createForm: true } as const;

/** Чи це запис форми — тобто чи є під ним розділ, у який вертає закриття. */
export function isCreateFormEntry(state: unknown): boolean {
  if (typeof state !== "object" || state === null) return false;
  return (state as { createForm?: unknown }).createForm === true;
}
