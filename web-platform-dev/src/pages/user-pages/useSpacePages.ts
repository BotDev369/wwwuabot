/**
 * Сторінки Простору: те, що автори відкрили для всіх.
 *
 * Джерело — `GET /api/space/pages`, публічний: видимість відбирає **сервер**
 * (`is_public = 1` у запиті до бази), тож тут немає жодного фільтра. Клієнт,
 * який «сам вирішує, що показати», одного дня показав би те, що хтось закрив, —
 * і зробив би це тихо.
 *
 * `reload` — звичайна спроба ще раз: стрічка залежить від чужого вибору, і
 * «нічого немає» може стати «хтось щойно відкрив сторінку».
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import { useCallback, useEffect, useState } from "react";
import type { PublicPage } from "@wwwuabot/shared/pages";
import { pagesApi } from "@/shared/api/pages.api";

export interface SpacePagesState {
  pages: PublicPage[];
  loading: boolean;
  error: string | null;
}

export function useSpacePages() {
  const [state, setState] = useState<SpacePagesState>({ pages: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    pagesApi
      .published()
      .then((pages) => {
        if (cancelled) return;
        setState({ pages, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          pages: [],
          loading: false,
          error: e instanceof Error ? e.message : "Не вдалося завантажити сторінки",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  /** Перечитати. `showSpinner` — для повтору після помилки, коли списку немає. */
  const reload = useCallback((showSpinner = false) => {
    if (showSpinner) setState((prev) => ({ ...prev, loading: true, error: null }));
    setAttempt((value) => value + 1);
  }, []);

  return { ...state, reload };
}
