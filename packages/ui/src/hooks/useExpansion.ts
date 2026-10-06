/**
 * Розгорнутість рядків-акордеонів: стан тримає хук, рядок лише малює.
 *
 * Типово **все згорнуто**: список читають згори вниз, а розгорнуті тіла роблять
 * із нього полотно, де не видно, скільки рядків узагалі є.
 *
 * @module packages/ui/src/hooks/useExpansion
 */

import { useCallback, useState } from "react";

export interface UseExpansionReturn {
  isExpanded: (id: string) => boolean;
  toggleExpanded: (id: string) => void;
}

export function useExpansion(): UseExpansionReturn {
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
