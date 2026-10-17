/**
 * Скільки в людини обраного — число для позначки у футері.
 *
 * Читаємо один раз, а не опитуємо: обране змінює сама людина, і кожну зміну
 * кладуть у спільний стан серце та екран «Обране».
 *
 * @module web-platform-dev/src/layout/useFavoritesBadge
 */

import { useEffect } from "react";
import { loadFavoritesCount, useFavoritesCount } from "@wwwuabot/ui/favorites";

export function useFavoritesBadge(): number {
  useEffect(() => {
    void loadFavoritesCount().catch(() => undefined);
  }, []);

  return useFavoritesCount();
}
