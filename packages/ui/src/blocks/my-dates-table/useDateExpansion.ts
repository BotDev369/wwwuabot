/**
 * Розгорнутість карток у списку дат: стан тримає хук, картка лише малює.
 *
 * Типово **всі згорнуті**: список читають згори вниз, а розгорнуті тіла
 * роблять із нього полотно, де не видно, скільки дат узагалі є (як у нотаток).
 *
 * @module packages/ui/src/blocks/my-dates-table/useDateExpansion
 */

import { useCallback, useState } from "react";

export interface UseDateExpansionReturn {
  isExpanded: (id: string) => boolean;
  toggleExpanded: (id: string) => void;
}

export function useDateExpansion(): UseDateExpansionReturn {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const isExpanded = useCallback((id: string) => expandedIds.has(id), [expandedIds]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return { isExpanded, toggleExpanded };
}
