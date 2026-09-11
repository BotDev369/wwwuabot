/**
 * Вибір рядків у таблиці «Моїх дат».
 *
 * «Вибрати все» працює по відфільтрованому списку — саме те, що бачить
 * користувач, а не по всіх датах.
 *
 * @module packages/ui/src/blocks/my-dates-table/useDateSelection
 */

import { useCallback, useState } from "react";
import type { MyDate } from "./types";

export interface UseDateSelectionReturn {
  selectedIds: Set<string>;
  /** Галочка в шапці: якщо вибрано все видиме — зняти вибір. */
  toggleAll: () => void;
  toggleSelect: (id: string) => void;
  clearSelection: () => void;
}

export function useDateSelection(visibleDates: MyDate[]): UseDateSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === visibleDates.length ? new Set() : new Set(visibleDates.map((d) => d.id)),
    );
  }, [visibleDates]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  return { selectedIds, toggleAll, toggleSelect, clearSelection };
}
