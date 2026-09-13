/**
 * Адреса сторінки: одна сутність `slug` і два її подання.
 *
 * **Навіщо це переписано.** До 13.09.2026 адреса існувала двічі: `web_slug`
 * (адреса вебу) і `codeword` (ключ діплінка бота). Це той самий рядок у двох
 * колонках, і саме тому правило «яка сторінка відповідає цьому URL» доводилось
 * писати чотири рази по-різному: SQL `web_slug = ? OR codeword = ?` в API,
 * `splat || "__base__"` у платформі, `pages.find(…) ?? pages[0]` у
 * `SiteRenderer`, `getScenario` у боті.
 *
 * Тепер адреса одна — рядок `slug`:
 *
 * | Подання | Вигляд | Хто будує |
 * |---|---|---|
 * | веб | `/mydate/1980-03-03/today` | `toWebPath()` |
 * | бот | `?start=mydate_1980-03-03_today` | `toBotPayload()` |
 *
 * **Чому саме `_` у боті, і чому сегмент не може містити `_`.** Алфавіт
 * параметра `?start=` задає Telegram: `A-Za-z0-9_-`, не більше 64 символів.
 * Слеш туди не влізе, тому розділювачем стає `_` — а отже `_` **всередині**
 * сегмента зробив би зворотне перетворення неоднозначним. Це не примха, а
 * вимога, і саме тому вона перевіряється (`isValidSlug`), а не «мається на
 * увазі».
 *
 * **Функції чисті:** вони не ходять у базу. Які сторінки взагалі доступні,
 * вирішує сховище (SQL-фільтр або список у пам'яті) — бо в редакторі чернетка
 * мусить бути видимою, а назовні ні.
 *
 * @module @wwwuabot/shared/content/resolve
 */

import type { ContentPage } from "./types";

/** Порожній `slug` — головна сторінка. */
export const HOME_SLUG = "";

/**
 * Легасі-ключ головної сторінки в таблицях `scenarios*` (до фази 3).
 *
 * Він лишається в маршруті `GET /api/scenario/:slug`, бо сегмент URL не буває
 * порожнім, а сама адреса головної — порожня. Це домовленість **транспорту**,
 * не моделі: у базі головна має `slug = ''`.
 */
export const LEGACY_HOME_KEY = "__base__";

/** Розділювач сегментів у веб-адресі. */
export const WEB_SEPARATOR = "/";

/** Розділювач сегментів у `?start=` — його вимагає алфавіт Telegram. */
export const BOT_SEPARATOR = "_";

/** Максимум символів у параметрі `?start=`. Довший Telegram обрізає. */
export const MAX_BOT_PAYLOAD = 64;

/**
 * Сегмент slug: маленькі латинські літери, цифри й `-` між ними.
 *
 * Ані `_` (розділювач у боті), ані `/` (розділювач у вебі), ані крапки.
 */
const SEGMENT_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Канонічний вигляд адреси: без слешів по краях, без подвоєних, без query й
 * хеша. Головна — `''`. Регістр не змінюється: це перевірка, а не переписування
 * чужих даних (хто хоче інший регістр — побачить це в `isValidSlug`).
 */
export function normalizeSlug(ref?: string | null): string {
  const withoutQuery = (ref ?? "").trim().split(/[?#]/)[0] ?? "";
  if (withoutQuery === LEGACY_HOME_KEY) return HOME_SLUG;

  const trimmed = withoutQuery.replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
  return trimmed;
}

/** Сегменти адреси: `'a/b'` → `['a','b']`, головна → `[]`. */
export function slugSegments(ref?: string | null): string[] {
  const normalized = normalizeSlug(ref);
  return normalized === HOME_SLUG ? [] : normalized.split(WEB_SEPARATOR);
}

/** Чи адреса канонічна — тобто чи можна її без втрат показати і в боті, і у вебі. */
export function isValidSlug(ref: string): boolean {
  const segments = slugSegments(ref);
  // Порожній список — це головна сторінка: адреса порожня, і це законно.
  return segments.every((segment) => SEGMENT_RE.test(segment));
}

/**
 * Веб-адреса сторінки: `toWebPath('mydate', ['1980-03-03', 'today'])` →
 * `'/mydate/1980-03-03/today'`, для головної — `'/'`.
 */
export function toWebPath(ref: string, params: readonly string[] = []): string {
  const segments = [...slugSegments(ref), ...params.map((param) => normalizeSlug(param))];
  return segments.length === 0 ? WEB_SEPARATOR : WEB_SEPARATOR + segments.join(WEB_SEPARATOR);
}

/**
 * Параметр діплінка: `toBotPayload('mydate', ['1980-03-03', 'today'])` →
 * `'mydate_1980-03-03_today'`, для головної — `''` (тобто `/start` без
 * параметра).
 */
export function toBotPayload(ref: string, params: readonly string[] = []): string {
  return [...slugSegments(ref), ...params.map((param) => normalizeSlug(param))].join(BOT_SEPARATOR);
}

/**
 * Чи згенерований діплінк дійде до сторінки.
 *
 * Перевіряти треба **під час побудови посилання**: задовгий параметр Telegram
 * мовчки обрізає, і дізнатись про це вже неможливо.
 */
export function isDeepLinkable(ref: string, params: readonly string[] = []): boolean {
  const payload = toBotPayload(ref, params);
  return payload.length <= MAX_BOT_PAYLOAD;
}

/** Сегменти з параметра `?start=`: `'a_b'` → `['a','b']`, порожній → `[]`. */
export function botPayloadSegments(payload?: string | null): string[] {
  const trimmed = (payload ?? "").trim();
  return trimmed === "" ? [] : trimmed.split(BOT_SEPARATOR);
}

/** Сторінка плюс те, що в адресі стоїть **після** неї (дата, вигляд, фільтр). */
export interface ContentRoute {
  page: ContentPage;
  /**
   * Сегменти після адреси сторінки: `'/mydate/1980-03-03/today'` для сторінки
   * `mydate` дає `['1980-03-03', 'today']`. Дані, а не адреса: рядків у таблиці
   * для кожної дати не існує і не мусить існувати.
   */
  params: string[];
}

/**
 * Знаходить сторінку за сегментами. **Найдовший збіг перемагає** — це єдине
 * місце, де вирішується неоднозначність: якщо є і `mydate`, і `mydate/x`, то
 * `/mydate/x/y` належить `mydate/x` з параметром `y`. Без цього правила той
 * самий URL вів би до різних сторінок залежно від порядку в масиві.
 */
function matchRoute(
  pages: readonly ContentPage[],
  segments: readonly string[],
): ContentRoute | null {
  if (segments.length === 0) {
    const home = pages.find((page) => normalizeSlug(page.slug) === HOME_SLUG);
    return home ? { page: home, params: [] } : null;
  }

  let best: ContentPage | null = null;
  let bestLength = -1;
  for (const page of pages) {
    const pageSegments = slugSegments(page.slug);
    if (pageSegments.length === 0 || pageSegments.length > segments.length) continue;
    if (!pageSegments.every((segment, index) => segment === segments[index])) continue;
    if (pageSegments.length > bestLength) {
      best = page;
      bestLength = pageSegments.length;
    }
  }

  return best ? { page: best, params: segments.slice(bestLength) } : null;
}

/**
 * Веб-адреса → сторінка й параметри. Строга: невідома адреса дає `null`.
 *
 * Відкат на головну тут **навмисно відсутній** — це рішення виклику.
 * «Показати головну» і «показати 404» — різні продукти, а не різні реалізації
 * одного правила; хто хоче відкат, бере `pickContentPage`.
 */
export function resolveContentRoute(
  pages: readonly ContentPage[],
  ref?: string | null,
): ContentRoute | null {
  return matchRoute(pages, slugSegments(ref));
}

/** Те саме для параметра `?start=` із бота: `'mydate_1980-03-03_today'`. */
export function resolveBotPayload(
  pages: readonly ContentPage[],
  payload?: string | null,
): ContentRoute | null {
  return matchRoute(pages, botPayloadSegments(payload));
}

/**
 * Вибирає сторінку з відкатом на головну (як було історично): найдовший збіг
 * адреси, далі головна (`HOME_SLUG`), далі `null` — хай виклик вирішує сам.
 * Тонка обгортка над `resolveContentRoute`.
 */
export function pickContentPage(
  pages: readonly ContentPage[],
  ref?: string | null,
): ContentPage | null {
  const route = resolveContentRoute(pages, ref);
  if (route) return route.page;
  return pages.find((page) => normalizeSlug(page.slug) === HOME_SLUG) ?? null;
}
