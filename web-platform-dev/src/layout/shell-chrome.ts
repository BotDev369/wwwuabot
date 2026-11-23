/**
 * Стан хедера з реєстру — одна функція для каркаса й тесту: назва й крохи
 * виводяться з адреси, тож перевірка проганяє весь реєстр тією самою дорогою,
 * що й застосунок.
 *
 * @module web-platform-dev/src/layout/shell-chrome
 */

import type { ScreenRow } from "@wwwuabot/shared/screens";
import type { ScreenChrome } from "@wwwuabot/ui/nav";
import { screenTrail } from "./screen-trail";

/** Порожній стан: назву й крохи дає реєстр, дій у екрана немає. */
export const EMPTY_SHELL_CHROME: ScreenChrome = {
  title: null,
  ancestors: [],
  menu: null,
  share: null,
  favorite: null,
};

/**
 * Хедер для адреси: назва поточного рівня + батьки.
 *
 * Назва з екрана (`chrome.title`, наприклад «Астрагал») замінює статичну назву
 * останнього рівня; усе інше — з реєстру. Екран без `useScreenChrome` теж
 * отримує крохи, бо `.wb-appbar` не має права лишитись без шляху.
 */
export function shellChromeFor(
  chrome: ScreenChrome | undefined,
  rows: readonly ScreenRow[],
  pathname: string,
): ScreenChrome {
  const trail = screenTrail(rows, pathname, chrome?.title ?? null);
  return {
    ...(chrome ?? EMPTY_SHELL_CHROME),
    title: chrome?.title ?? trail[trail.length - 1]?.label ?? null,
    ancestors: trail.slice(0, -1),
  };
}
