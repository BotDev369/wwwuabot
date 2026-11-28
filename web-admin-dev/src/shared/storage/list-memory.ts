/**
 * Пам'ять вигляду списку — пошук, фільтри й порядок (D31): у кожного екрана свій
 * ключ `wb.admin.<екран>.view`, читання раз на монтування, запис на кожну зміну,
 * а битий JSON, чужі типи й закрите сховище дають типові значення.
 *
 * @module web-admin-dev/src/shared/storage/list-memory
 */

import { useCallback, useRef, useState } from "react";

/** Що лежить у сховищі: об'єкт, а що з нього брати — вирішує `coerce` екрана. */
export type StoredView = Record<string, unknown>;

const keyOf = (screen: string) => `wb.admin.${screen}.view`;

function readRaw(screen: string): StoredView | null {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(keyOf(screen)) ?? "null");
    return raw && typeof raw === "object" ? (raw as StoredView) : null;
  } catch {
    return null;
  }
}

/** Збережений вигляд; немає чи сміття — `coerce(null)` дає типові поля. */
export function readListMemory<T>(screen: string, coerce: (raw: StoredView | null) => T): T {
  return coerce(readRaw(screen));
}

/** Записати вигляд; недоступне сховище лишає вибір тільки до перезавантаження. */
export function writeListMemory<T>(screen: string, view: T): void {
  try {
    localStorage.setItem(keyOf(screen), JSON.stringify(view));
  } catch {
    // Сховище недоступне — вибір діє до перезавантаження, і це краще за падіння.
  }
}

/**
 * Стан вигляду списку, який переживає перезавантаження панелі.
 *
 * `patch` дописує поля до поточного вигляду: два селекти на екрані не затирають
 * вибір один одного. Поточний вигляд тримає `ref`, а не попередній стан, бо
 * запис у сховище — побічна дія, і в подвійному виклику updater'а вона б
 * повторилась.
 */
export function useListMemory<T>(
  screen: string,
  coerce: (raw: StoredView | null) => T,
): [T, (patch: Partial<T>) => void] {
  const [view, setView] = useState<T>(() => readListMemory(screen, coerce));
  const current = useRef(view);

  const update = useCallback(
    (patch: Partial<T>) => {
      current.current = { ...current.current, ...patch };
      setView(current.current);
      writeListMemory(screen, current.current);
    },
    [screen],
  );

  return [view, update];
}
