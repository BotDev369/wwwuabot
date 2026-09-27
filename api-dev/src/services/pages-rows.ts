/**
 * Рядок `scenarios` → сторінка, яку хтось **веде**: хто це й ким він тут є.
 *
 * **Навіщо окремий модуль.** Це переклад даних, а не робота з ними: тут немає
 * жодного запиту (імена читає `pages.service`), зате є рішення, яке мусить бути
 * одним на всі входи — хто власник, хто адмін і кому рядок узагалі видно. Другий
 * такий переклад у сервісі розійшовся б із першим саме там, де помилка
 * найдорожча: у видимості (`AGENTS.md` §7).
 *
 * **Чому не `pageRole` на місці.** Роль рахує спільний модуль
 * (`@wwwuabot/shared/pages/access`), а тут лишається те, чого він не знає:
 * звідки брати `owner_id` й `admin_ids` у рядка бази та як їх назвати в
 * клієнта. Сміття в колонці не відбирає доступ у власника — саме тому
 * переклад стоїть **до** перевірки ролі, а не після.
 *
 * @module api-dev/src/services/pages-rows
 */

import {
  DEFAULT_PAGE_TEMPLATE,
  isPageTemplateKey,
  pageAdminIds,
  pageRole,
  pageStaffIds,
  pageTemplate,
  pageTitle,
  readPageValues,
  type PageFieldValues,
  type PageStaff,
  type PageTemplate,
  type UserPage,
} from "@wwwuabot/shared/pages";
import { parsePageConfig } from "@wwwuabot/shared/types/page-config";

/** Колонки сторінки, які читає й пише сервіс; `SELECT *` тут заборонений. */
export const PAGE_COLUMNS =
  "id, slug, title, page_data, template_key, is_public, owner_id, admin_ids, updated_at";

/** Один рядок `scenarios` — рівно ті колонки, що в `PAGE_COLUMNS`. */
export interface PageRow {
  id: number;
  slug: string;
  title: string | null;
  page_data: string | null;
  template_key: string | null;
  is_public: number | null;
  owner_id: string | number | null;
  admin_ids: string | null;
  updated_at: string | null;
}

/** Невідомий ключ шаблону читається як типовий: сторінка все одно відкривається. */
export function templateOf(row: PageRow): PageTemplate {
  return pageTemplate(
    isPageTemplateKey(row.template_key) ? row.template_key : DEFAULT_PAGE_TEMPLATE,
  );
}

/**
 * Власник рядка числом; `null` — контенту платформи не існує.
 *
 * Колонка — `TEXT` (id людини й акаунт сесії мають різну природу,
 * `docs/DATA_MODEL.md`), тож число тут з'являється перекладом, а не зберіганням.
 */
export function ownerOf(row: PageRow): number | null {
  const id = Number(row.owner_id);
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Хто веде сторінку — власник першим, далі адміни; власника у списку не двічі. */
export function staffOf(row: PageRow, names: ReadonlyMap<number, string | null>): PageStaff[] {
  const ownerId = ownerOf(row);
  const staff: PageStaff[] = [];

  if (ownerId !== null) {
    staff.push({ id: ownerId, name: names.get(ownerId) ?? null, role: "owner" });
  }
  for (const id of pageAdminIds(row.admin_ids)) {
    if (id === ownerId) continue;
    staff.push({ id, name: names.get(id) ?? null, role: "admin" });
  }
  return staff;
}

/** Усі, кому належить рядок: власник і адміни — для читання імен і оповіщень. */
export function pageStaffIdList(row: PageRow): number[] {
  return pageStaffIds(ownerOf(row), pageAdminIds(row.admin_ids));
}

/**
 * Рядок бази → сторінка для клієнта; `null` — рядок не цієї людини.
 *
 * `null` тут не помилка, а **межа**: сторінку повертають лише власнику та його
 * адмінам, і кому більше — вирішує `pageRole`, а не той, хто кличе.
 */
export function toManagedPage(
  row: PageRow,
  userId: number,
  names: ReadonlyMap<number, string | null>,
): UserPage | null {
  const role = pageRole(ownerOf(row), pageAdminIds(row.admin_ids), userId);
  if (role === null) return null;

  const template = templateOf(row);
  const values: PageFieldValues = readPageValues(template, parsePageConfig(row.page_data));

  return {
    id: Number(row.id),
    slug: row.slug,
    title: row.title ?? pageTitle(template, values),
    template: template.key,
    values,
    // Колонка додана наявній таблиці, тож у старих рядків там `NULL`, а не `0`.
    isPublic: Number(row.is_public ?? 0) === 1,
    staff: staffOf(row, names),
    role,
    updatedAt: row.updated_at ?? "",
  };
}
