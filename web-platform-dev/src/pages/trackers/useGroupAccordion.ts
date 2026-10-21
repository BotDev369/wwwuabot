/**
 * Акордеон груп: стан розгорнутості живе в `localStorage`, бо вибір людини —
 * це її вибір, а не налаштування сервера: дотик не скидається при переході
 * між екранами. Дефолт — **усі згорнуті**: перший вхід показує структуру
 * (заголовки з рахунком), а не стіну всіх мірок одразу.
 *
 * @module web-platform-dev/src/pages/trackers/useGroupAccordion
 */

import { useCallback, useState } from "react";

const STORAGE_KEY = "wb-tracker-groups-open";

/** Прочитане зі сховища; погані значення — порожній набір, а не помилка. */
function readOpen(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((id): id is number => Number.isInteger(id)));
  } catch {
    return new Set();
  }
}

function writeOpen(open: Set<number>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...open]));
  } catch {
    // Сховище недоступне (приватний режим) — стан лишається в пам'яті сесії.
  }
}

export interface GroupAccordion {
  isOpen: (id: number) => boolean;
  toggle: (id: number) => void;
}

export function useGroupAccordion(): GroupAccordion {
  const [open, setOpen] = useState<Set<number>>(readOpen);

  const toggle = useCallback((id: number) => {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      writeOpen(next);
      return next;
    });
  }, []);

  const isOpen = useCallback((id: number) => open.has(id), [open]);

  return { isOpen, toggle };
}
