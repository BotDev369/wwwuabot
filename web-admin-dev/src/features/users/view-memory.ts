/**
 * Пам'ять вигляду «Користувачів»: пошук і порядок рядків (D31).
 *
 * Механізм спільний з іншими списками (`shared/storage/list-memory`), а перелік
 * полів сортування — тут: це правило цього екрана, а не сховища.
 *
 * @module web-admin-dev/src/features/users/view-memory
 */

import type { SortDir, SortField } from "./store";
import { readListMemory, writeListMemory } from "../../shared/storage/list-memory";

const SCREEN = "users";

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
  return readListMemory(SCREEN, (raw) => ({
    search: typeof raw?.search === "string" ? raw.search : "",
    sortField: pickField(raw?.sortField),
    sortDir: pickDir(raw?.sortDir),
  }));
}

/** Записати вибір; недоступне сховище лишає його тільки до перезавантаження. */
export function writeViewMemory(memory: ViewMemory): void {
  writeListMemory(SCREEN, memory);
}
