/**
 * Позначка «нове в обраному» для футера: читання й підписка.
 *
 * Сервера тут немає навмисно: «нове» — це те, що людина ще не відкривала.
 *
 * @module packages/ui/src/favorites/useFavoritesNew
 */

import { useSyncExternalStore } from "react";
import { favoritesNewCount, subscribeFavoritesNew } from "./favorites-new";

export function useFavoritesNewCount(): number {
  return useSyncExternalStore(subscribeFavoritesNew, favoritesNewCount, favoritesNewCount);
}
