/**
 * Стан акордеонів сторінки моніторингу: що розгорнуто і кнопка «всі».
 *
 * Стан живе тут, а не в `MonitoringPage` (AGENTS.md §3: компонент — лише
 * рендеринг). Один набір на всю сторінку, а не окремий прапорець у кожній
 * панелі: інакше «розгорнути всі» неможливо було б реалізувати, не знаючи
 * про кожну панель окремо.
 *
 * **Типово все закрито.** Сторінка моніторингу — це огляд станів, а не
 * простирадло чисел: спершу видно перелік розділів, і людина сама вирішує,
 * що читати.
 *
 * @module web-admin-dev/src/pages/monitoring/usePanels
 */

import { useCallback, useState } from "react";

/** Розділи сторінки — список потрібен лише для перемикача «розгорнути всі». */
export const MONITORING_PANELS = [
  "code",
  "github",
  "dynamics",
  "metrics",
  "workspaces",
  "collectors",
  "history",
] as const;

export type MonitoringPanelId = (typeof MONITORING_PANELS)[number];

export interface PanelsState {
  readonly isOpen: (id: MonitoringPanelId) => boolean;
  readonly toggle: (id: MonitoringPanelId) => void;
  /** Чи розгорнуто все — від цього залежить напис на перемикачі. */
  readonly allOpen: boolean;
  readonly toggleAll: () => void;
}

export function usePanels(): PanelsState {
  const [open, setOpen] = useState<ReadonlySet<MonitoringPanelId>>(() => new Set());

  const toggle = useCallback((id: MonitoringPanelId) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setOpen((prev) =>
      prev.size === MONITORING_PANELS.length ? new Set() : new Set(MONITORING_PANELS),
    );
  }, []);

  const isOpen = useCallback((id: MonitoringPanelId) => open.has(id), [open]);

  return { isOpen, toggle, allOpen: open.size === MONITORING_PANELS.length, toggleAll };
}
