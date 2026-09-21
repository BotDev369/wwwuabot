/**
 * Профіль однієї людини в Просторі.
 *
 * Джерело — `GET /api/space/users/:id`, публічний. Закритий і неіснуючий
 * профіль віддають **однакову** відмову: різні відповіді сказали б, що людина
 * в нас є, але сховалась (AGENTS.md §7), тож клієнт і не намагається їх
 * розрізнити — він показує те, що сказав сервер.
 *
 * **Стан — не «останній профіль», а відповідь на конкретну адресу.** Тому в
 * ньому лежить `id`, який її викликав: перехід з однієї людини на іншу не
 * показує чужу картку під новою адресою, поки прийде відповідь.
 *
 * @module web-platform-dev/src/pages/useSpaceUser
 */

import { useEffect, useState } from "react";
import type { PublicProfile } from "@wwwuabot/shared";
import { apiFetch } from "@/shared/api/client";

interface SpaceUserResponse {
  ok?: boolean;
  profile?: PublicProfile;
}

export interface SpaceUserState {
  profile: PublicProfile | null;
  loading: boolean;
  error: string | null;
}

/** Завантажена відповідь **разом з адресою**, на яку вона прийшла. */
interface LoadedProfile {
  id: number;
  profile: PublicProfile | null;
  error: string | null;
}

const UNAVAILABLE = "Профіль недоступний";

/** `id` — `null`, якщо в адресі не число: тоді запиту немає взагалі. */
export function useSpaceUser(id: number | null): SpaceUserState {
  const [loaded, setLoaded] = useState<LoadedProfile | null>(null);

  useEffect(() => {
    if (id === null) return;

    let cancelled = false;

    apiFetch<SpaceUserResponse>(`/api/space/users/${id}`)
      .then((data) => {
        if (cancelled) return;
        setLoaded({
          id,
          profile: data?.profile ?? null,
          error: data?.profile ? null : UNAVAILABLE,
        });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setLoaded({ id, profile: null, error: e instanceof Error ? e.message : UNAVAILABLE });
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Некоректна адреса не потребує ні запиту, ні стану — вона відома заздалегідь.
  if (id === null) return { profile: null, loading: false, error: UNAVAILABLE };

  // Відповідь на **іншу** адресу не показується: інакше картка попередньої
  // людини висіла б під новою адресою до кінця запиту.
  if (!loaded || loaded.id !== id) return { profile: null, loading: true, error: null };

  return { profile: loaded.profile, loading: false, error: loaded.error };
}
