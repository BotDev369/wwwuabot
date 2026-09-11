/**
 * Сортування, фільтри та похідні списки «Моїх дат».
 *
 * Стан фільтрів і те, що з нього випливає, живе тут; самі перетворення —
 * чисті функції в `./filter-sort`.
 *
 * @module packages/ui/src/blocks/my-dates-table/useDateFilters
 */

import { useCallback, useMemo, useState } from "react";
import { getAllTypes } from "@wwwuabot/shared/utils/mydate-helpers";
import type { MyDate, SortField, SortOrder } from "./types";
import { collectTags, filterDates, sortDates } from "./filter-sort";

export interface UseDateFiltersReturn {
  /** Відфільтрований і відсортований список — те, що бачить користувач. */
  processedDates: MyDate[];
  allTags: string[];
  allTypes: string[];

  sortField: SortField;
  sortOrder: SortOrder;
  /** Задати поле й напрям явно (напр. скинути на «назва за зростанням»). */
  setSort: (field: SortField, order: SortOrder) => void;
  /** Клік по заголовку: те саме поле — перевернути напрям, інше — `asc`. */
  toggleSort: (field: SortField) => void;

  searchQuery: string;
  setSearchQuery: (q: string) => void;
  columnFilters: Record<string, string[]>;
  toggleColumnFilter: (field: string, value: string) => void;
  clearColumnFilter: (field: string) => void;
}

/** Початковий набір колонок — щоб `columnFilters[field]` ніколи не був `undefined`. */
const EMPTY_FILTERS: Record<string, string[]> = {
  name: [],
  date: [],
  tags: [],
  type: [],
  notes: [],
};

export function useDateFilters(dates: MyDate[]): UseDateFiltersReturn {
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>(EMPTY_FILTERS);

  const allTags = useMemo(() => collectTags(dates), [dates]);
  const allTypes = useMemo(() => getAllTypes(dates), [dates]);
  const processedDates = useMemo(
    () => sortDates(filterDates(dates, searchQuery, columnFilters), sortField, sortOrder),
    [dates, searchQuery, columnFilters, sortField, sortOrder],
  );

  const setSort = useCallback((field: SortField, order: SortOrder) => {
    setSortField(field);
    setSortOrder(order);
  }, []);

  const toggleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      else setSort(field, "asc");
    },
    [setSort, sortField],
  );

  const toggleColumnFilter = useCallback((field: string, value: string) => {
    setColumnFilters((prev) => {
      const current = prev[field] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [field]: next };
    });
  }, []);

  const clearColumnFilter = useCallback((field: string) => {
    setColumnFilters((prev) => ({ ...prev, [field]: [] }));
  }, []);

  return {
    processedDates,
    allTags,
    allTypes,
    sortField,
    sortOrder,
    setSort,
    toggleSort,
    searchQuery,
    setSearchQuery,
    columnFilters,
    toggleColumnFilter,
    clearColumnFilter,
  };
}
