/**
 * Число обраного для позначки у футері: читання, оновлення, підписка.
 *
 * Читаємо **один раз при вході**: обране змінює сама людина, і кожну зміну
 * видно тут же (`setFavoritesCount`), тож опитування не потрібне.
 *
 * @module packages/ui/src/favorites/useFavoritesCount
 */

import { useSyncExternalStore } from "react";
import { apiFetch } from "@wwwuabot/shared";
import { telegramAuthHeaders } from "@wwwuabot/shared/security/telegram";
import { favoritesCount, setFavoritesCount, subscribeFavoritesCount } from "./favorites-count";

/** Спитати в сервера, скільки обраного, і покласти число в спільний стан. */
export async function loadFavoritesCount(): Promise<void> {
  const result = await apiFetch<{ count?: number }>("/api/favorites?count=1", {
    headers: telegramAuthHeaders(),
  });
  setFavoritesCount(result.count ?? 0);
}

export function useFavoritesCount(): number {
  return useSyncExternalStore(subscribeFavoritesCount, favoritesCount, favoritesCount);
}
