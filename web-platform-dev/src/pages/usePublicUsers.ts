/**
 * Публічні люди: ті, хто сам показав свій профіль.
 *
 * Джерело — `GET /api/public/users`, публічний: у стрічку дивляться без входу, а
 * видимість кожного профілю відбирає **сервер** — тому тут немає жодного
 * фільтра. Клієнт, який «сам вирішує, що показати», одного дня показав би те,
 * що хтось закрив.
 *
 * `reload` — звичайна спроба ще раз: стрічка залежить від чужого вибору, і
 * «нічого немає» може стати «хтось щойно відкрився».
 *
 * @module web-platform-dev/src/pages/usePublicUsers
 */

import { useCallback, useEffect, useState } from "react";
import type { PublicProfile } from "@wwwuabot/shared";
import { apiFetch } from "@/shared/api/client";

interface PublicUsersResponse {
  ok?: boolean;
  items?: PublicProfile[];
}

export interface PublicUsersState {
  items: PublicProfile[];
  loading: boolean;
  error: string | null;
}

export function usePublicUsers() {
  const [state, setState] = useState<PublicUsersState>({ items: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    apiFetch<PublicUsersResponse>("/api/public/users")
      .then((data) => {
        if (cancelled) return;
        setState({ items: data?.items ?? [], loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          items: [],
          loading: false,
          error: e instanceof Error ? e.message : "Не вдалося завантажити список",
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
