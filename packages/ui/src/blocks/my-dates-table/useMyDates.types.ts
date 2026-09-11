/**
 * Типи хука «Моїх дат».
 *
 * Виділено з `useMyDates.ts`, щоб сам хук лишався читабельним
 * (docs/CONSOLIDATION_PLAN.md §3.3).
 *
 * @module packages/ui/src/blocks/my-dates-table/useMyDates.types
 */

import type { MyDate } from "./types";
import type { UseDateFiltersReturn } from "./useDateFilters";
import type { UseDateModalReturn } from "./useDateModal";
import type { UseDateSelectionReturn } from "./useDateSelection";

export interface UseMyDatesOptions {
  /** Завантажити список при монтуванні (типово `true`). */
  autoFetch?: boolean;
  /** Перезавантажувати список після save/delete (типово `true`). */
  refreshAfterMutation?: boolean;
}

export interface UseMyDatesReturn
  extends UseDateFiltersReturn,
    UseDateSelectionReturn,
    UseDateModalReturn {
  /** Усі дати, як прийшли з API (до фільтрів). */
  dates: MyDate[];
  /** `true` лише до першої відповіді API. */
  loading: boolean;
  error: string | null;
  refreshDates: () => Promise<void>;
  handleSave: (data: Partial<MyDate>) => Promise<void>;
  handleDelete: (id: string) => Promise<void>;
  handleBulkDelete: () => Promise<void>;
  handleBulkCompare: () => void;
}
