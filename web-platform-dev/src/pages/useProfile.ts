/**
 * Дані профілю для TWA.
 *
 * Джерело — `GET /api/user/profile`: ідентичність там беруть із підписаного
 * `initData`, а не з query-параметра, тож клієнт не передає жодного `user_id`
 * і не може попросити чужий профіль.
 *
 * Стан живе тут, а не в компоненті: `ProfilePage` і `ProfileAccountPage`
 * лишаються рендерингом, а цей хук знає, звідки беруться дані й куди йде нове
 * ім'я.
 *
 * **Фото не підмінюється.** Аватар Telegram приходить усередині `telegram`
 * (`photo_url` з підписаного `initData` — окремого запиту до Telegram немає), і
 * саме звідти його бере спільний хелпер `telegramPhoto`. Підставляти його в
 * `photoUrl` не можна: `photoUrl` — це фото **платформи**, і людина одного дня
 * побачила б під своїм іменем чуже фото, вважаючи його власним.
 *
 * @module web-platform-dev/src/pages/useProfile
 */

import { useCallback, useEffect, useState } from "react";
import type { PublicProfileChange, UserProfileData } from "@wwwuabot/shared";
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

export function useProfile() {
  const [state, setState] = useState<ProfileState>({ profile: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    apiFetch<ProfileResponse>("/api/user/profile")
      .then((data) => {
        if (cancelled) return;
        setState({
          profile: data?.user ?? null,
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

  /** «Про себе» — те саме правило: причина відмови приходить із сервера. */
  const saveAbout = useCallback(async (value: string): Promise<string | null> => {
    try {
      const data = await apiFetch<{ ok?: boolean; about?: string }>("/api/user/about", {
        method: "POST",
        body: JSON.stringify({ about: value }),
      });

      if (typeof data?.about !== "string") return "Не вдалося зберегти";

      setState((prev) => ({
        ...prev,
        profile: prev.profile ? { ...prev.profile, about: data.about } : prev.profile,
      }));
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : "Не вдалося зберегти";
    }
  }, []);

  /**
   * Публічність і набір відкритих полів — **одним запитом**.
   *
   * Стан після невдачі лишається тим, що відповів сервер: увімкнений
   * перемикач, який не зберігся, був би найгіршим із можливих — людина
   * вважала б профіль відкритим, а він закритий.
   */
  const saveVisibility = useCallback(async (next: PublicProfileChange): Promise<string | null> => {
    try {
      const data = await apiFetch<{
        ok?: boolean;
        isPublic?: boolean;
        openFields?: UserProfileData["openFields"];
      }>("/api/user/visibility", {
        method: "POST",
        body: JSON.stringify({ public: next.isPublic, fields: next.fields }),
      });

      setState((prev) =>
        prev.profile
          ? {
              ...prev,
              profile: {
                ...prev.profile,
                isPublic: data?.isPublic ?? next.isPublic,
                openFields: data?.openFields ?? next.fields,
              },
            }
          : prev,
      );
      return null;
    } catch (e: unknown) {
      return e instanceof Error ? e.message : "Не вдалося зберегти";
    }
  }, []);

  return { ...state, saveUsername, saveAbout, saveVisibility };
}
