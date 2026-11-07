import { useCallback, useEffect, useRef, useState } from "react";
import { setFavoritesNewCount } from "@wwwuabot/ui/favorites";
import type { FavoriteItem, FavoriteSort, FavoritesResponse } from "@wwwuabot/shared/favorites";
import { apiFetch } from "@/shared/api/client";

interface FavoritesState {
  items: FavoriteItem[];
  loading: boolean;
  /** Причина — код, а не речення: слова екрана живуть у його рядку `scenarios`. */
  error: "load" | null;
  busy: string | null;
  sort: FavoriteSort;
  setSort: (sort: FavoriteSort) => void;
  reload: () => Promise<void>;
  /** `true` — рядок прибрано; `false` — ні, і причина вже є в екрана. */
  remove: (item: FavoriteItem) => Promise<boolean>;
}

export function useFavorites(): FavoritesState {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"load" | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // Порядок — стан екрана, а не запис: сервер віддає обране найновішим першим,
  // і саме він лишається типовим (див. `sortFavorites`).
  const [sort, setSort] = useState<FavoriteSort>("date");
  const generation = useRef(0);
  const locked = useRef(false);

  const load = useCallback(async () => {
    const request = ++generation.current;
    try {
      const result = await apiFetch<FavoritesResponse>("/api/favorites");
      if (request === generation.current) {
        setItems(result.items);
        // Відкритий список — це «побачено»: позначка у футері обнуляється, а не
        // показує все обране (вона саме про нове, див. `docs/FAVORITES.md`).
        setFavoritesNewCount(0);
        setError(null);
      }
    } catch {
      if (request === generation.current) setError("load");
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) void load();
    });
    return () => {
      cancelled = true;
    };
  }, [load]);

  function reload() {
    setLoading(true);
    setError(null);
    return load();
  }

  async function remove(item: FavoriteItem): Promise<boolean> {
    if (locked.current) return false;
    locked.current = true;
    setBusy(`${item.kind}:${item.targetId}`);
    try {
      await apiFetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: item.kind, targetId: item.targetId }),
      });
      setItems((current) =>
        current.filter((value) => value.kind !== item.kind || value.targetId !== item.targetId),
      );
      return true;
    } catch {
      return false;
    } finally {
      locked.current = false;
      setBusy(null);
    }
  }

  return { items, loading, error, busy, sort, setSort, reload, remove };
}
