import { useEffect, useRef, useState } from "react";
import { useDialog } from "@wwwuabot/ui/dialog";
import type { FavoriteTarget } from "@wwwuabot/shared/favorites";
import { apiFetch } from "@/shared/api/client";

interface LoadedLike {
  key: string;
  liked: boolean;
  failed: boolean;
}

export function useFavorite(target: FavoriteTarget) {
  const dialog = useDialog();
  const { kind, targetId } = target;
  const key = `${kind}:${targetId}`;
  const [loaded, setLoaded] = useState<LoadedLike | null>(null);
  const [saving, setSaving] = useState(false);
  const locked = useRef(false);
  const current = loaded?.key === key ? loaded : null;

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ liked: boolean }>(`/api/favorites?kind=${kind}&targetId=${targetId}`)
      .then((result) => {
        if (!cancelled) setLoaded({ key, liked: result.liked, failed: false });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key, liked: false, failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [kind, targetId, key]);

  async function toggle(): Promise<void> {
    if (!current || locked.current) return;
    locked.current = true;
    setSaving(true);
    try {
      const result = current.failed
        ? await apiFetch<{ liked: boolean }>(`/api/favorites?kind=${kind}&targetId=${targetId}`)
        : await apiFetch<{ liked: boolean }>("/api/favorites", {
            method: current.liked ? "DELETE" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(target),
          });
      setLoaded({ key, liked: result.liked, failed: false });
    } catch {
      await dialog.alert("Не вдалося зберегти лайк. Спробуйте ще раз.", { tone: "danger" });
    } finally {
      locked.current = false;
      setSaving(false);
    }
  }
  return {
    liked: current?.liked ?? false,
    failed: current?.failed ?? false,
    busy: current === null || saving,
    toggle,
  };
}
