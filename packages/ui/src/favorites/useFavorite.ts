/**
 * `useFavorite` — стан серця на «щось, що можна любити»: сторінка або профіль
 * людини.
 *
 * **Ставлення й знімання — одна функція.** `liked` приїжджає з сервера, тож
 * кнопка ніколи не «запам'ятовує» натискання: якщо запис не дійшов, серце
 * повертається туди, де було (`busy` блокує повторний клік, поки летить).
 *
 * **Помилка — голос.** Тихий збій зробив би кнопку «мертвою» без пояснення,
 * тому невдача йде в `useDialog()` — той самий, що в решті продукту.
 *
 * @module packages/ui/src/favorites/useFavorite
 */

import { useEffect, useRef, useState } from "react";
import { apiFetch } from "@wwwuabot/shared";
import { telegramAuthHeaders } from "@wwwuabot/shared/security/telegram";
import type { FavoriteTarget } from "@wwwuabot/shared/favorites";
import { useDialog } from "@wwwuabot/ui/dialog";

interface LoadedLike {
  key: string;
  liked: boolean;
  failed: boolean;
}

async function likeRequest(target: FavoriteTarget, method: "POST" | "DELETE") {
  return apiFetch<{ liked: boolean }>("/api/favorites", {
    headers: { ...telegramAuthHeaders(), "Content-Type": "application/json" },
    fetchOptions: method === "POST" ? { method, body: JSON.stringify(target) } : { method },
  });
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
    apiFetch<{ liked: boolean }>(`/api/favorites?kind=${kind}&targetId=${targetId}`, {
      headers: telegramAuthHeaders(),
    })
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
      // Не вдалося прочитати — спершу довідуємось, чи воно взагалі є, і лише
      // потім ставимо або знімаємо серце.
      const result = current.failed
        ? await apiFetch<{ liked: boolean }>(`/api/favorites?kind=${kind}&targetId=${targetId}`, {
            headers: telegramAuthHeaders(),
          })
        : await likeRequest(target, current.liked ? "DELETE" : "POST");
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
