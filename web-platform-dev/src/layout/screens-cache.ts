/**
 * Кеш реєстру екранів на сесію: один запит на застосунок, збій мережі — порожньо.
 *
 * @module web-platform-dev/src/layout/screens-cache
 */

import type { ScreenRow } from "@wwwuabot/shared/screens";
import { fetchScreens } from "@/shared/api/screens.api";

let cached: ScreenRow[] | null = null;
let inFlight: Promise<ScreenRow[]> | null = null;

/** Прочитати реєстр; збій мережі — порожній список, а не падіння каркаса. */
export function loadScreens(): Promise<ScreenRow[]> {
  if (cached) return Promise.resolve(cached);
  if (!inFlight) {
    inFlight = fetchScreens()
      .then((rows) => {
        cached = rows;
        return rows;
      })
      .catch(() => [] as ScreenRow[])
      .finally(() => {
        inFlight = null;
      });
  }
  return inFlight;
}

/** Забути прочитане: потрібно тестам і правці екрана без перезавантаження. */
export function forgetScreens(): void {
  cached = null;
  inFlight = null;
}
