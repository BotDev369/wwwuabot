import { useCallback, useEffect, useRef, useState } from "react";
import { useDialog } from "@wwwuabot/ui/dialog";
import type { FavoriteItem, FavoritesResponse } from "@wwwuabot/shared/favorites";
import { apiFetch } from "@/shared/api/client";

export function useFavorites() {
  const dialog = useDialog();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const generation = useRef(0);
  const locked = useRef(false);

  const load = useCallback(async () => {
    const request = ++generation.current;
    try {
      const result = await apiFetch<FavoritesResponse>("/api/favorites");
      if (request === generation.current) {
        setItems(result.items);
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
  return { items, loading, error, busy, reload, remove };
}
