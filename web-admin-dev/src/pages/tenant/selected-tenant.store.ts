/**
 * Чий контент показує панель — стан, а не маршрут: обидва екрани читають один
 * ключ, і `localStorage` тримає його між перезавантаженнями.
 *
 * @module web-admin-dev/src/pages/tenant/selected-tenant.store
 */

import { create } from "zustand";

/** Головний проєкт: типовe значення й те, що видно без вибору. */
export const MAIN_TENANT = "main";

const STORAGE_KEY = "wb.admin.tenant";

interface SelectedTenantState {
  /** Ключ проєкту (`main`, `shop-a`). */
  key: string;
  /** Обрати проєкт і запам'ятати вибір. */
  select: (key: string) => void;
}

/** Збережений ключ; приватний режим і сміття в сховищі дають головний. */
function storedKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() || MAIN_TENANT;
  } catch {
    return MAIN_TENANT;
  }
}

export const useSelectedTenant = create<SelectedTenantState>((set) => ({
  key: storedKey(),
  select: (key) => {
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // Сховище недоступне — вибір діє до перезавантаження, і це краще за падіння.
    }
    set({ key });
  },
}));
