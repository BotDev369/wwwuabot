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
 * Адреса вже зберігається один раз у `slug`; adapter не обирає між двома
 * історичними назвами й не створює прихованих alias-ів.
 *
 * Ідентичність — `id` рядка, а не адреса: адресу редагують (саме для цього
 * номер і з'явився), і сторінка не мусить через це ставати іншою. Рядок без
 * `id` (читач, що не вибрав цю колонку) описується своєю **нормалізованою**
 * адресою — тією самою, за якою його шукають.
 */
export function contentPageFromScenario(row: ScenarioContentRow): ContentPage {
  const slug = normalizeSlug(row.slug);
  return {
    id: row.id != null ? String(row.id) : slug,
    slug,
    title: row.title ?? null,
    photoUrl: row.photo_url ?? null,
    // Шаблон читається як є: невідомий ключ не ламає показ, а `null` — це
    // контент платформи, у якого шаблону немає.
    templateKey: row.template_key ?? null,
    content: parsePageConfig(row.page_data ?? null),
    // Те саме, що робить SQL-фільтр `is_active = 1`: рядок без прапорця
    // назовні недоступний. `DEFAULT 1` у реєстрі гарантує, що такого не буває
    // у нових записів, але старі рядки могли лишитись із `NULL`.
    published: isActiveFlag(row.is_active),
    order: 0,
  };
}
