/**
 * Дані профілю для TWA.
 *
 * Джерело — `GET /api/user/profile`: ідентичність там беруть із підписаного
 * `initData`, а не з query-параметра, тож клієнт не передає жодного `user_id`
 * і не може попросити чужий профіль.
 *
 * Стан живе тут, а не в компоненті: `ProfilePage` лишається рендерингом, а
 * цей хук знає, звідки беруться дані й куди йде нове ім'я.
 *
 * @module web-platform-dev/src/pages/useProfile
 */

import { useCallback, useEffect, useState } from "react";
import type { UserProfileData } from "@wwwuabot/shared";
import { apiFetch } from "@/shared/api/client";

interface ProfileResponse {
  ok?: boolean;
  user?: UserProfileData;
}

export interface ProfileState {
  profile: UserProfileData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Аватар бере **справжнє** фото Telegram, а не лише окреме поле `photoUrl`:
 * `photo_url` приходить усередині payload, і людині дивно бачити ініціал там,
 * де Telegram уже віддав фото.
 */
function withTelegramPhoto(user: UserProfileData): UserProfileData {
  const photo = user.telegram?.photo_url;
  if (user.photoUrl || typeof photo !== "string" || !photo) return user;
  return { ...user, photoUrl: photo };
}

export function useProfile() {
  const [state, setState] = useState<ProfileState>({ profile: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    apiFetch<ProfileResponse>("/api/user/profile")
      .then((data) => {
        if (cancelled) return;
        setState({
          profile: data?.user ? withTelegramPhoto(data.user) : null,
          loading: false,
          error: data?.user ? null : "Профіль не знайдено",
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          profile: null,
          loading: false,
          error: e instanceof Error ? e.message : "Не вдалося завантажити профіль",
        });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Зберігає ім'я на платформі. Повертає текст помилки або `null` — саме так
   * форма показує причину відмови, не вигадуючи її сама (валідацію й
   * зайнятість імені знає сервер).
   */
  const saveUsername = useCallback(async (value: string): Promise<string | null> => {
    try {
      const data = await apiFetch<{ ok?: boolean; platformUsername?: string }>(
        "/api/user/username",
        {
          method: "POST",
          body: JSON.stringify({ username: value }),
        },
      );

      const saved = data?.platformUsername;
      if (!saved) return "Не вдалося зберегти ім'я";

      setState((prev) => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, platformUsername: saved } : prev.profile,
      }));
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : "Не вдалося зберегти ім'я";
    }
  }, []);

  return { ...state, saveUsername };
}
