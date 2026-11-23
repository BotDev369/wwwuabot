/**
 * Адреси екранів платформи — **подання реєстру**, а не другий список.
 *
 * Шаблони шляхів живуть у `packages/shared/src/screens/registry.json` (той самий
 * рядок, що їде в `platform_screens`); цей файл лише дає їм імена, якими
 * користуються сторінки й бот. Тому перейменувати сегмент можна **в одному
 * місці**, і маршрут, пункт меню та діплінк не розійдуться.
 *
 * **Намір теж адреса.** Екран, який уміє створювати, відкриває свою форму за
 * `?new=1` (`withCreateIntent`): адреса — це **вхід**, а не стан, тож вона
 * читається один раз, при появі. Це той самий прийом, що з відкриттям розмови
 * (`?peer=`, `@wwwuabot/shared/messages`).
 *
 * @module web-platform-dev/src/app/routes
 */

import { screenPath } from "@wwwuabot/shared/screens";

/**
 * Адреса розмови — зі спільного складу (`@wwwuabot/shared/messages`).
 *
 * Ту саму адресу складає бот для кнопки «Відкрити чат» (`messagesPeerPath`),
 * тож у неї один власник на два воркери, а не два літерали.
 */
export { MESSAGES_PATH } from "@wwwuabot/shared/messages";

/**
 * Три адреси, які читає ще й бот: рядок кнопок під першим екраном бота веде на
 * **ті самі екрани й у тому ж порядку**, що пункти меню (`screen.ts` у
 * `bot-dev`). Власник у них один — спільний модуль.
 */
import { ASSESSMENTS_PATH, TRACKERS_PATH } from "@wwwuabot/shared/app/routes";

export { ACCOUNT_PATH, FAVORITES_PATH, SERVICES_PATH } from "@wwwuabot/shared/app/routes";
export { ASSESSMENTS_PATH, TRACKERS_PATH };

/** Шлях екрана з реєстру; відсутній ключ — помилка збірки, а не `null` у грі. */
function pathOf(key: string): string {
  const path = screenPath(key);
  if (!path) throw new Error(`У реєстрі екранів немає адреси для «${key}»`);
  return path;
}

/** Сегмент адреси — те саме, що перший сегмент шляху. */
function segmentOf(key: string): string {
  return pathOf(key).replace(/^\//, "");
}

export const FAVORITES_ROUTE = segmentOf("favorites");

/** «Мій день» — щоденний екран, а не корінь. */
export const DAY_ROUTE = segmentOf("day");
export const DAY_PATH = pathOf("day");

/** Розділи аналізу мають власну головну. */
export const ANALYSIS_ROUTE = segmentOf("analysis");
export const ANALYSIS_PATH = pathOf("analysis");
export const ANALYSIS_PERSON_PATH = pathOf("analysis.person");
export const ANALYSIS_EVENT_PATH = pathOf("analysis.event");
export const ANALYSIS_COMPARE_PATH = pathOf("analysis.compare");
export const ANALYSIS_MATCH_PATH = pathOf("analysis.match");
export const ANALYSIS_SYSTEMS_PATH = pathOf("analysis.systems");
export const ANALYSIS_TESTS_PATH = pathOf("analysis.tests");
/** Довідник якостей: що це, як проявляється і які системи це визначають. */
export const ANALYSIS_QUALITIES_PATH = pathOf("analysis.qualities");
/** Люди, події й групи — повний CRUD і довільний вибір для співставлення. */
export const ANALYSIS_PEOPLE_PATH = pathOf("analysis.people");

/** Три розкладки головної на погодження: `/analysis/variant/1|2|3`. */
export const ANALYSIS_VARIANT_PATH = (variant: 1 | 2 | 3): string =>
  pathOf(`analysis.hub.${variant}`);

/** Сторінка, де всі три варіанти стоять поруч із підписами. */
export const ANALYSIS_VARIANTS_PATH = pathOf("analysis.variants");

/** Вид проходження: один суб'єкт або кілька для співставлення. */
export type AnalysisMode = "person" | "event" | "compare";

/** Крок проходження: анкета дат → системи → профіль. */
export function analysisStepPath(mode: AnalysisMode, step: "systems" | "result"): string {
  return pathOf(`analysis.${mode}.${step}`);
}

/** Проходження тесту — своя адреса під фічею, не окремий розділ. */
export function analysisTestPath(key: string): string {
  return pathOf("analysis.test").replace(":key", encodeURIComponent(key));
}

/**
 * Акаунт — дані людини: окремо платформа (`#ім'я`), окремо Telegram (`@хендл`).
 *
 * Адреса верхня, а не під хабу: хабу немає, і акаунт — це **сам екран** людини.
 */
export const ACCOUNT_ROUTE = segmentOf("account");

/** Замовлення — робота, яку людина веде, а не сторінка. */
export const ORDERS_ROUTE = segmentOf("orders");
export const ORDERS_PATH = pathOf("orders");

/** Оголошення — дошка, яку наповнюють люди. */
export const ADS_ROUTE = segmentOf("ads");
export const ADS_PATH = pathOf("ads");

/** Ігри — власні екрани платформи. */
export const GAMES_ROUTE = segmentOf("games");
export const GAMES_PATH = pathOf("games");

/** Користувачі — люди, які самі відкрили свій профіль. */
export const USERS_ROUTE = segmentOf("users");
export const USERS_PATH = pathOf("users");

/**
 * Сценарій за номером — адреса його вкладок: товарів і замовлень магазину.
 *
 * `scenarios` — верхній сегмент платформи, тож сторінка з таким `slug` не
 * відкриється: його стереже `RESERVED_PAGE_SLUGS` (виводиться з реєстру).
 */
export const SCENARIOS_ROUTE = pathOf("scenarios.products").split("/")[1] ?? "scenarios";
export const SCENARIOS_PATH = `/${SCENARIOS_ROUTE}`;

/** Крамниці — **список** відкритих крамниць, а не сторінка контенту. */
export const SHOPS_ROUTE = segmentOf("shops");
export const SHOPS_PATH = pathOf("shops");

/** Один сценарій за номером: під ним стоять вкладки магазину. */
export const scenarioPath = (id: number): string => `${SCENARIOS_PATH}/${id}`;

export { RESEARCH_PATH, RESEARCH_ROUTE } from "@/pages/research/route";

/** Товари магазину — **під сценарієм**, а не окремим розділом. */
export const SHOP_PRODUCTS_ROUTE = "products";
export const shopProductsPath = (scenarioId: number): string =>
  pathOf("scenarios.products").replace(":id", String(scenarioId));

/** Новий товар — **окрема адреса**: у форми є «назад», історія й посилання. */
export const shopProductNewPath = (scenarioId: number): string =>
  pathOf("scenarios.product.new").replace(":id", String(scenarioId));

/** Правка товару: за адресою стоїть один рядок `shop_products`. */
export const shopProductEditPath = (scenarioId: number, productId: number): string =>
  pathOf("scenarios.product")
    .replace(":id", String(scenarioId))
    .replace(":productId", String(productId));

/** Замовлення магазину — там само, де товари, і з тієї ж причини. */
export const SHOP_ORDERS_ROUTE = "orders";
export const shopOrdersPath = (scenarioId: number): string =>
  pathOf("scenarios.orders").replace(":id", String(scenarioId));

/** Одне замовлення — **своя адреса**, а не модалка. */
export const shopOrderPath = (scenarioId: number, orderId: number): string =>
  pathOf("scenarios.order").replace(":id", String(scenarioId)).replace(":orderId", String(orderId));

/** Трекери — власні щоденні записи людини. */
export const TRACKERS_ROUTE = segmentOf("trackers");

/** Нотатки — власні дані людини, не рядок контенту. */
export const NOTES_ROUTE = segmentOf("notes");
export const NOTES_PATH = pathOf("notes");

/** Контакти — довідник людини, теж не рядок контенту. */
export const CONTACTS_ROUTE = segmentOf("contacts");
export const CONTACTS_PATH = pathOf("contacts");

/** Сервіси — список екранів платформи, які вже працюють. */
export const SERVICES_ROUTE = segmentOf("services");

/** «Розвиток» — самооцінка й аналіз власних дат, не рядок контенту. */
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
 * Група, у якій створити рядок: `/trackers?new=1&group=12`.
 */
export const CREATE_GROUP_PARAM = "group";

/** Чи просять відкрити створення. Правда — одна: **адреса**. */
export function readCreateIntent(params: URLSearchParams): boolean {
  return params.get(CREATE_INTENT_PARAM) === CREATE_INTENT_VALUE;
}

/** Та сама адреса, але з наміром створити. */
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

/** Та сама адреса **без** наміру — чим лишається екран, коли форму закрито. */
export function withoutCreateIntent(path: string): string {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.delete(CREATE_INTENT_PARAM);
  const rest = params.toString();
  return rest ? `${base}?${rest}` : base;
}

/** Позначка запису, який **відкрив форму**. */
export const CREATE_FORM_STATE = { createForm: true } as const;

/** Чи це запис форми — тобто чи є під ним розділ, у який вертає закриття. */
export function isCreateFormEntry(state: unknown): boolean {
  if (typeof state !== "object" || state === null) return false;
  return (state as { createForm?: unknown }).createForm === true;
}
