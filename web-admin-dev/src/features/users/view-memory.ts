/**
 * Пам'ять пошуку й сортування в «Користувачах»: вибір повертається після
 * перезавантаження, а сміття в сховищі дає типові значення.
 *
 * @module web-admin-dev/src/features/users/view-memory
 */

import type { SortDir, SortField } from "./store";

const STORAGE_KEY = "wb.admin.users.view";

const SORT_FIELDS: readonly SortField[] = [
  "user_id",
  "first_name",
  "username",
  "created_at",
  "tenant_key",
];
const SORT_DIRS: readonly SortDir[] = ["asc", "desc"];

/** Що саме пам'ятаємо: запит пошуку й порядок рядків. */
export interface ViewMemory {
  search: string;
  sortField: SortField;
  sortDir: SortDir;
}

/** Типовий вигляд: усі люди, за ID, за зростанням. */
export function defaultView(): ViewMemory {
  return { search: "", sortField: "user_id", sortDir: "asc" };
}

function pickField(value: unknown): SortField {
  return SORT_FIELDS.includes(value as SortField) ? (value as SortField) : "user_id";
}

function pickDir(value: unknown): SortDir {
  return SORT_DIRS.includes(value as SortDir) ? (value as SortDir) : "asc";
}

/** Збережене; битий JSON, чужі поля й приватний режим дають типовий вигляд. */
export function readViewMemory(): ViewMemory {
  let raw: unknown;
  try {
    raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
  } catch {
    return defaultView();
  }
  if (!raw || typeof raw !== "object") return defaultView();

  const stored = raw as Record<string, unknown>;
  return {
    search: typeof stored.search === "string" ? stored.search : "",
    sortField: pickField(stored.sortField),
    sortDir: pickDir(stored.sortDir),
  };
}

/** Записати вибір; недоступне сховище лишає його тільки до перезавантаження. */
export function writeViewMemory(memory: ViewMemory): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // Сховище недоступне — вибір діє до перезавантаження, і це краще за падіння.
  }
}
