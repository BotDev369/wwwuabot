/**
 * Чисті функції для «Моїх дат»: теги, фільтрація, сортування.
 *
 * Тут немає жодного стану й жодного React — тільки перетворення масиву дат.
 * Виділено з хука, щоб його можна було тестувати без рендера
 * (docs/CONSOLIDATION_PLAN.md §3.3).
 *
 * @module packages/ui/src/blocks/my-dates-table/filter-sort
 */

import { formatDate } from "@wwwuabot/shared/utils/mydate-helpers";
import type { MyDate, SortField, SortOrder } from "./types";

/** Унікальні теги з усіх дат, за алфавітом. */
export function collectTags(dates: MyDate[]): string[] {
  const tags = new Set<string>();
  dates.forEach((d) => (d.tags || []).forEach((t) => tags.add(t)));
  return [...tags].sort();
}

/** Значення клітинки, за яким порівнюється рядок у фільтрі колонки. */
function cellValue(date: MyDate, field: string): string {
  switch (field) {
    case "type":
      return date.type || "";
    case "name":
      return date.name || "";
    case "notes":
      return date.notes || "";
    case "date":
      return date.date || "";
    default:
      return "";
  }
}

/**
 * Пошук по всіх текстових полях + фільтри по колонках.
 * Порожній фільтр (`[]`) означає «не фільтрувати», а не «нічого не показувати».
 */
export function filterDates(
  dates: MyDate[],
  searchQuery: string,
  columnFilters: Record<string, string[]>,
): MyDate[] {
  let result = [...dates];

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase().trim();
    result = result.filter(
      (d) =>
        (d.name || "").toLowerCase().includes(q) ||
        (d.notes || "").toLowerCase().includes(q) ||
        (d.tags || []).some((t) => t.toLowerCase().includes(q)) ||
        formatDate(d.date).includes(q),
    );
  }

  for (const [field, values] of Object.entries(columnFilters)) {
    if (values.length === 0) continue;
    result = result.filter((d) => {
      // «Теги» — єдине поле-масив: збіг, якщо хоч один тег вибраний.
      if (field === "tags") return (d.tags || []).some((t) => values.includes(t));
      return values.includes(cellValue(d, field));
    });
  }

  return result;
}

/** Значення для порівняння: дата — числом, решта — рядком у нижньому регістрі. */
function sortValue(date: MyDate, field: SortField): string | number {
  switch (field) {
    case "date":
      return new Date(date.date).getTime();
    case "created_at":
      return date.created_at || "";
    case "type":
      return (date.type || "").toLowerCase();
    case "tags":
      return (date.tags || []).join(", ").toLowerCase();
    case "notes":
      return (date.notes || "").toLowerCase();
    case "name":
    default:
      return (date.name || "").toLowerCase();
  }
}

/**
 * Порівняння значень одного поля.
 *
 * Рядки — через `localeCompare("uk")`, а не `>`: код-поінтне порівняння ставить
 * «і» (U+0456) ПІСЛЯ «я», тобто український список виглядає перемішаним.
 */
function compareValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "uk");
}

/** Сортування копії масиву за полем і напрямом. */
export function sortDates(
  dates: MyDate[],
  sortField: SortField,
  sortOrder: SortOrder,
): MyDate[] {
  const direction = sortOrder === "asc" ? 1 : -1;
  return [...dates].sort(
    (a, b) => compareValues(sortValue(a, sortField), sortValue(b, sortField)) * direction,
  );
}
