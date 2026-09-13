/**
 * Адаптери: запис із сховища → `ContentPage`.
 *
 * Кожне сховище парсило `page_data` власним кодом, і саме тому новий формат
 * контенту доводилося підтримувати в трьох місцях одночасно. Тут це робить
 * одна функція на сховище.
 *
 * Форма входу в адаптерів різна **навмисно**, і це відображає реальність, а не
 * недогляд: сценарій `api-dev` читає сирим рядком (`page_data` — це JSON), а
 * сторінки сайту проходять через `toSitePage()`, тому приходять уже
 * розібраними. Вигадувати для них спільний вхід означало б парсити вдруге.
 *
 * @module @wwwuabot/shared/content/adapters
 */

import { parsePageConfig } from "../types/page-config.utils";
import type { SitePage } from "../types/site.types";
import { normalizeSlug } from "./resolve";
import type { ContentPage, ScenarioContentRow } from "./types";

/** `is_active` приходить із D1 як число, рядок або `null`. */
function isActiveFlag(value: number | string | null | undefined): boolean {
  return value === 1 || value === "1";
}

/**
 * Нормалізує рядок сценарію (таблиця `scenarios`).
 *
 * **Дві назви адреси зводяться в одну — і це останнє місце, де вони живуть.**
 * Легасі-рядок має `web_slug` (адреса вебу) і `codeword` (ключ діплінка), хоч
 * це той самий рядок. Перевага віддається `web_slug`: адреса — те, що людина
 * бачить у рядку браузера, а діплінк будується **з** адреси, не навпаки.
 * Коли `web_slug` порожній (у більшості сценаріїв його немає) — адресою стає
 * `codeword`, тобто те саме «codeword і slug — це одне».
 */
export function contentPageFromScenario(row: ScenarioContentRow): ContentPage {
  const fromWeb = normalizeSlug(row.web_slug ?? "");
  const fromKey = normalizeSlug(row.codeword);

  return {
    id: row.codeword,
    slug: fromWeb === "" ? fromKey : fromWeb,
    title: row.title ?? null,
    photoUrl: row.photo_url ?? null,
    content: parsePageConfig(row.page_data ?? null),
    source: "scenarios",
    // Те саме, що робить SQL-фільтр `is_active = 1`: рядок без прапорця
    // назовні недоступний. `DEFAULT 1` у реєстрі гарантує, що такого не буває
    // у нових записів, але старі рядки могли лишитись із `NULL`.
    published: isActiveFlag(row.is_active),
    order: 0,
  };
}

/**
 * Нормалізує сторінку сайту.
 *
 * `pageData` тут уже `PageConfig` — розбір і легасі-формат зробив `toSitePage`
 * (`types/site.types.ts`), тож удруге не парсимо.
 */
export function contentPageFromSitePage(page: SitePage): ContentPage {
  return {
    id: page.id,
    slug: normalizeSlug(page.slug),
    title: page.title ?? null,
    // Фото належить сайту (`sites.thumbnail`), а не сторінці — колонки немає.
    photoUrl: null,
    content: page.pageData ?? null,
    source: "site_pages",
    published: page.status === "published",
    order: page.orderIndex ?? 0,
  };
}
