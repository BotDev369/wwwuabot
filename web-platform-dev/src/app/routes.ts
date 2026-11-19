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
 * **Сторінку створює платформа, а не людина:** окремого екрана сторінки немає
 * взагалі — контент відкривається за своїм `slug` одним `ScenarioPage`, і
 * править його тільки розробник: кодом і міграціями, а не форма в інтерфейсі.
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

/**
 * Три адреси, які читає ще й бот: рядок кнопок під першим екраном бота веде на
 * **ті самі екрани й у тому ж порядку**, що пункти футера (`screen.ts` у
 * `bot-dev`). Власник у них один — спільний модуль, а не цей файл: два літерали
 * однієї адреси розійшлися б тихо, і кнопка в чаті відкрила б 404.
 */
import { ASSESSMENTS_PATH, TRACKERS_PATH } from "@wwwuabot/shared/app/routes";

export { ACCOUNT_PATH, FAVORITES_PATH, SERVICES_PATH } from "@wwwuabot/shared/app/routes";
export { ASSESSMENTS_PATH, TRACKERS_PATH };

export const FAVORITES_ROUTE = "favorites";

/**
 * «Мій день» — щоденний екран, а не корінь.
 *
 * Корінь `/` — вітрина з входами (макет 08 · Вхід / вітрина): хто ми, для кого
 * й три двері всередину. День живе під власною адресою, бо це **екран**
 * усередині продукту, а не його обкладинка: інакше людина, яка відкрила
 * посилання вперше, одразу потрапляла б у порожній день без пояснень.
 */
export const DAY_ROUTE = "day";
export const DAY_PATH = `/${DAY_ROUTE}`;

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
 * (`/scenarios/7/orders`). Другої реалізації того самого списку тут немає: цей
 * екран каже лише **де** працює людина — власником чи адміном, — і веде до
 * замовлень того магазину. Тому адреса має власний сегмент, а не живе під
 * сценарієм: під ним уже стоять товари й замовлення **одного** магазину.
 */
export const ORDERS_ROUTE = "orders";
export const ORDERS_PATH = `/${ORDERS_ROUTE}`;

/**
 * Тема — **перемикач**, а не сторінки: світла й темна міняються однією дією,
 * тож адреса тут нічого не додає — її нікуди не надіслати й не відкрити з
 * іншого місця. Кнопка теми стоїть у хедері (`AppBar`).
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
 * Сценарій за номером — адреса його вкладок: товарів і замовлень магазину.
 *
 * Сам сценарій відкривається за своїм `slug` (`/slug`) і рендериться одним
 * `ScenarioPage` — іншого екрана сторінки немає ні в платформі, ні в адмінці.
 * Номер рядка `scenarios` потрібен лише там, де під сторінкою стоять **дані,
 * яких у `page_data` немає**: `shop_products` і `shop_orders` належать тому
 * самому рядку (`shop_id`), тож їхні адреси стоять під ним —
 * `/scenarios/7/products`. Окремий розділ `/shop` зробив би другу навігацію по
 * тому самому контенту (`AGENTS.md` §7).
 *
 * `scenarios` — верхній сегмент платформи, тож сторінка з таким `slug` не
 * відкриється: його стереже `RESERVED_PAGE_SLUGS`.
 */
export const SCENARIOS_ROUTE = "scenarios";
export const SCENARIOS_PATH = `/${SCENARIOS_ROUTE}`;

/**
 * Магазини — **список** відкритих магазинів, а не сторінка контенту: сам
 * магазин відкривається своїм `slug` (`/kava`) і рендериться тим самим
 * `ScenarioPage`. Список адресу має тому, що це вибірка з `scenarios`
 * (`template_key = 'shop'`); `shops` не може стати адресою сторінки — його
 * стереже `RESERVED_PAGE_SLUGS` (`docs/SHOPS.md` §9).
 */
export const SHOPS_ROUTE = "shops";
export const SHOPS_PATH = `/${SHOPS_ROUTE}`;

/** Один сценарій за номером рядка: під ним стоять вкладки магазину. */
export const scenarioPath = (id: number): string => `${SCENARIOS_PATH}/${id}`;

export { RESEARCH_PATH, RESEARCH_ROUTE } from "@/pages/research/route";

/**
 * Товари магазину — **під сценарієм**, а не окремим розділом.
 *
 * Магазин — це рядок `scenarios` зі своєю адресою, а товари належать йому
 * (`shop_id`), тож і адреса їхня стоїть під ним: `/scenarios/7/products`.
 *
 * `products` під `:id` не збивається з `orders`: це різні сегменти на одному
 * місці, і сценарій не може мати адреси `scenarios`.
 */
export const SHOP_PRODUCTS_ROUTE = "products";
export const shopProductsPath = (scenarioId: number): string =>
  `${scenarioPath(scenarioId)}/${SHOP_PRODUCTS_ROUTE}`;

/** Новий товар — **окрема адреса**: у форми є «назад», історія й посилання. */
export const shopProductNewPath = (scenarioId: number): string =>
  `${shopProductsPath(scenarioId)}/new`;

/** Правка товару: за адресою стоїть один рядок `shop_products`. */
export const shopProductEditPath = (scenarioId: number, productId: number): string =>
  `${shopProductsPath(scenarioId)}/${productId}`;

/**
 * Замовлення магазину — там само, де товари, і з тієї ж причини.
 *
 * `shop_orders` належить тому самому рядку `scenarios`, тож адреса стоїть під
 * ним: `/scenarios/7/orders`.
 *
 * Сегмент свій, а не вкладка в товарах: замовлення — це **робота з людиною**, а
 * товари — каталог, і змішуються вони лише в одному випадку: коли магазин
 * зовсім порожній.
 */
export const SHOP_ORDERS_ROUTE = "orders";
export const shopOrdersPath = (scenarioId: number): string =>
  `${scenarioPath(scenarioId)}/${SHOP_ORDERS_ROUTE}`;

/**
 * Одне замовлення — **своя адреса**, і це вибір, а не дрібниця.
 *
 * Правка — не перегляд: у неї є «назад» до черги, історія й посилання, яке можна
 * надіслати (`AGENTS.md` §7). Модалка не має жодного з трьох, а власне замовлення
 * з позиціями, контактом і коментарем — це місце, куди людина повертається, тож
 * адреса в нього мусить бути. Сегмент — номер у тому самому `orders`.
 */
export const shopOrderPath = (scenarioId: number, orderId: number): string =>
  `${shopOrdersPath(scenarioId)}/${orderId}`;

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
 * «Розвиток» — самооцінка й аналіз власних дат, не рядок `scenarios`.
 *
 * **Адреса розділу й адреса проходження — різні речі:** `/assessments`
 * показує список тестів, а `/assessments/:key` — саме проходження. Тому
 * «назад» у Telegram повертає на список, а не виходить із розділу, і
 * посиланням можна дати конкретний тест.
 *
 * Сам шлях — реекспорт зі спільного модуля вище: він один на платформу й бота
 * (четвертий пункт футера = четверта кнопка під першим екраном). Тут лишається
 * тільки сегмент маршруту.
 *
 * Довший шлях мусить стояти **перед** коротшим у роутері, як `:id` у
 * `/pages`: інакше `:key` зʼїсть сам розділ.
 */
export const ASSESSMENTS_ROUTE = "assessments";

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
