/**
 * Спільна бібліотека схем — те, що люди відкрили для всіх.
 *
 * Запит **публічний**: видимість відбирає сам запит до бази (`is_public = 1`),
 * тож закрита схема не приїде сюди навіть прямим запитом. Тому цей хук можна
 * кликати де завгодно — і у вкладці «Теми» Простору, і в розділі теми.
 *
 * @module web-platform-dev/src/pages/themes/useSharedThemes
 */

import { useCallback, useEffect, useState } from "react";
import type { ThemeScheme } from "@wwwuabot/shared/themes";
import { themesApi } from "@/shared/api/themes.api";

export interface SharedThemesState {
  items: ThemeScheme[];
  loading: boolean;
  error: string | null;
}

const EMPTY: SharedThemesState = { items: [], loading: true, error: null };

export function useSharedThemes() {
  const [state, setState] = useState<SharedThemesState>(EMPTY);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    themesApi
      .listShared()
      .then((items) => {
        if (!cancelled) setState({ items, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          items: [],
          loading: false,
          error: e instanceof Error ? e.message : "Не вдалося завантажити бібліотеку",
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
