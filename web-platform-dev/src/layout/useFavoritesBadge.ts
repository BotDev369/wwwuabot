/**
 * Позначка «нове в обраному» для футера: обнуляє її відкритий `/favorites`.
 * Живе в `localStorage` (ключ — Telegram-id із `initData`: лише ключ, не доказ
 * ідентичності), бо перезапуск не має повертати побачене. Правила й причина —
 * `docs/FAVORITES.md`.
 * @module web-platform-dev/src/layout/useFavoritesBadge
 */

import { useEffect } from "react";
import { readInitData } from "@wwwuabot/shared/security/telegram";
import {
  favoritesNewCount,
  setFavoritesNewCount,
  subscribeFavoritesNew,
  useFavoritesNewCount,
} from "@wwwuabot/ui/favorites";

const STORAGE_PREFIX = "wb-favorites-new:";

/** Ключ сховища для поточного акаунта; `null` — поза Telegram. */
function storageKey(): string | null {
  const initData = readInitData();
  if (!initData) return null;
  try {
    const user = JSON.parse(new URLSearchParams(initData).get("user") ?? "") as { id?: unknown };
    const id = Number(user?.id);
    return Number.isFinite(id) ? `${STORAGE_PREFIX}${id}` : null;
  } catch {
    return null;
  }
}

function stored(key: string | null): number {
  if (!key) return 0;
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) && value > 0 ? Math.trunc(value) : 0;
}

export function useFavoritesBadge(): number {
  const count = useFavoritesNewCount();

  useEffect(() => {
    const key = storageKey();
    setFavoritesNewCount(stored(key));
    if (!key) return;
    return subscribeFavoritesNew(() => {
      window.localStorage.setItem(key, String(favoritesNewCount()));
    });
  }, []);

  return count;
}
