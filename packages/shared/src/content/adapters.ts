/**
 * Адаптери: запис із сховища → `ContentPage`.
 *
 * Кожне сховище парсило `page_data` власним кодом, і саме тому новий формат
 * контенту доводилося підтримувати в трьох місцях одночасно. Тепер джерело
 * одне — таблиця `scenarios`; другого адаптера не буде, бо не буде другого
 * сховища (`docs/CONTENT_MODEL.md`).
 *
 * @module @wwwuabot/shared/content/adapters
 */

import { parsePageConfig } from "../types/page-config.utils";
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
    // Те саме, що робить SQL-фільтр `is_active = 1`: рядок без прапорця
    // назовні недоступний. `DEFAULT 1` у реєстрі гарантує, що такого не буває
    // у нових записів, але старі рядки могли лишитись із `NULL`.
    published: isActiveFlag(row.is_active),
    order: 0,
  };
}
