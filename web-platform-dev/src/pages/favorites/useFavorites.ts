import { useCallback, useEffect, useRef, useState } from "react";
import { useDialog } from "@wwwuabot/ui/dialog";
import { setFavoritesNewCount } from "@wwwuabot/ui/favorites";
import type { FavoriteItem, FavoriteSort, FavoritesResponse } from "@wwwuabot/shared/favorites";
import { apiFetch } from "@/shared/api/client";

interface FavoritesState {
  items: FavoriteItem[];
  loading: boolean;
  error: string | null;
  busy: string | null;
  sort: FavoriteSort;
  setSort: (sort: FavoriteSort) => void;
  reload: () => Promise<void>;
  remove: (item: FavoriteItem) => Promise<void>;
}

export function useFavorites(): FavoritesState {
  const dialog = useDialog();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
      if (request === generation.current) setError("Не вдалося завантажити обране.");
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

  async function remove(item: FavoriteItem) {
    if (locked.current) return;
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
    } catch {
      await dialog.alert("Не вдалося прибрати лайк.", { tone: "danger" });
    } finally {
      locked.current = false;
      setBusy(null);
    }
  }
  return { items, loading, error, busy, sort, setSort, reload, remove };
}
