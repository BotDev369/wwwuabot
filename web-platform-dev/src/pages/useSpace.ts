/**
 * Дані Простору: люди, які самі показали свій профіль.
 *
 * Джерело — `GET /api/space/users`, публічний: у стрічку дивляться без входу, а
 * видимість кожного профілю відбирає **сервер** — тому тут немає жодного
 * фільтра. Клієнт, який «сам вирішує, що показати», одного дня показав би те,
 * що хтось закрив.
 *
 * `reload` — звичайна спроба ще раз: стрічка залежить від чужого вибору, і
 * «нічого немає» може стати «хтось щойно відкрився».
 *
 * @module web-platform-dev/src/pages/useSpace
 */

import { useCallback, useEffect, useState } from "react";
import type { PublicProfile } from "@wwwuabot/shared";
import { apiFetch } from "@/shared/api/client";

interface SpaceResponse {
  ok?: boolean;
  items?: PublicProfile[];
}

export interface SpaceState {
  items: PublicProfile[];
  loading: boolean;
  error: string | null;
}

export function useSpace() {
  const [state, setState] = useState<SpaceState>({ items: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    apiFetch<SpaceResponse>("/api/space/users")
      .then((data) => {
        if (cancelled) return;
        setState({ items: data?.items ?? [], loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          items: [],
          loading: false,
          error: e instanceof Error ? e.message : "Не вдалося завантажити простір",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, reload };
}
