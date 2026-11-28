/**
 * Пам'ять фільтра «Проєкт»: вибір переживає перезавантаження, а проєкт, якого
 * вже немає серед людей, мовчки знімається.
 *
 * @module web-admin-dev/src/features/users/tenant-filter-storage
 */

import type { UserRow } from "../../shared/api/users.api";
import { tenantKeyOf } from "../../pages/users/user-row";

const STORAGE_KEY = "wb.admin.users.tenant";

/** Збережений ключ; приватний режим і сміття в сховищі означають «усі». */
export function readTenantFilter(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

/** Записати вибір; `null` прибирає його зовсім. */
export function writeTenantFilter(key: string | null): void {
  try {
    if (key) localStorage.setItem(STORAGE_KEY, key);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Сховище недоступне — фільтр діє до перезавантаження, і це краще за падіння.
  }
}

/**
 * Фільтр, який справді є серед людей; інакше `null`.
 *
 * Порожній список теж знімає вибір: вибирати вже нема з чого, а стара пам'ять
 * дала б порожню таблицю без видимого фільтра.
 */
export function keepKnownFilter(key: string | null, items: readonly UserRow[]): string | null {
  if (!key) return null;
  return items.some((user) => tenantKeyOf(user) === key) ? key : null;
}
