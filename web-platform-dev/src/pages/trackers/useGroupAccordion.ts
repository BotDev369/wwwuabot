/**
 * Акордеон груп: стан розгорнутості живе в `localStorage` (це вибір людини, а
 * не налаштування сервера). Дефолт — усі згорнуті; ключ — номер рядка у
 * власних групах і назва заголовка в списках на читання.
 *
 * @module web-platform-dev/src/pages/trackers/useGroupAccordion
 */

import { useCallback, useState } from "react";

const DEFAULT_STORAGE_KEY = "wb-tracker-groups-open";

/** Ключ групи: номер рядка у власних групах, назва — у списках на читання. */
export type AccordionKey = number | string;

/** Прочитане зі сховища; погані значення — порожній набір, а не помилка. */
function readOpen(storageKey: string): Set<AccordionKey> {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed: unknown = raw === null ? [] : JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(
      parsed.filter((key): key is AccordionKey => typeof key === "string" || Number.isInteger(key)),
    );
  } catch {
    return new Set();
  }
}

function writeOpen(storageKey: string, open: Set<AccordionKey>): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...open]));
  } catch {
    // Сховище недоступне (приватний режим) — стан лишається в пам'яті сесії.
  }
}

export interface GroupAccordion {
  isOpen: (key: AccordionKey) => boolean;
  toggle: (key: AccordionKey) => void;
  /** Усі групи списку розгорнуті — від цього залежить підпис дії смуги. */
  allOpen: (keys: readonly AccordionKey[]) => boolean;
  /** Одна дія на всі: «Розгорнути» відкриває кожну, «Згорнути» — закриває. */
  setAll: (keys: readonly AccordionKey[], open: boolean) => void;
}

export function useGroupAccordion(storageKey: string = DEFAULT_STORAGE_KEY): GroupAccordion {
  const [open, setOpen] = useState<Set<AccordionKey>>(() => readOpen(storageKey));

  const toggle = useCallback(
    (key: AccordionKey) => {
      setOpen((current) => {
        const next = new Set(current);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        writeOpen(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const isOpen = useCallback((key: AccordionKey) => open.has(key), [open]);

  const allOpen = useCallback(
    (keys: readonly AccordionKey[]) => keys.length > 0 && keys.every((key) => open.has(key)),
    [open],
  );

  const setAll = useCallback(
    (keys: readonly AccordionKey[], shouldOpen: boolean) => {
      setOpen((current) => {
        const next = new Set(current);
        for (const key of keys) {
          if (shouldOpen) next.add(key);
          else next.delete(key);
        }
        writeOpen(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  return { isOpen, toggle, allOpen, setAll };
}
