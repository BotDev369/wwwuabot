/**
 * Власні схеми теми — разом із закритими, і з діями над ними.
 *
 * **Окремо від спільної бібліотеки.** Власні читаються з-під підписаного
 * `initData` й містять закриті схеми; спільна — публічна. Один запит на обидва
 * мусив би або відкрити закриті схеми всім, або сховати від людини її ж
 * бібліотеку — тож це два хуки, і кожен тягне рівно те, що йому потрібно.
 *
 * **Після запису список перечитується, але не порожніє.** Схема — це річ, яку
 * людина щойно зберегла; показати їй натомість скелет завантаження означало б
 * відповісти на дію зникненням списку.
 *
 * @module web-platform-dev/src/pages/themes/useMyThemes
 */

import { useCallback, useEffect, useState } from "react";
import type { ThemeScheme, ThemeSchemeInput } from "@wwwuabot/shared/themes";
import { themesApi } from "@/shared/api/themes.api";

export interface MyThemesState {
  items: ThemeScheme[];
  loading: boolean;
  error: string | null;
}

const EMPTY: MyThemesState = { items: [], loading: true, error: null };

export function useMyThemes() {
  const [state, setState] = useState<MyThemesState>(EMPTY);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    themesApi
      .listMine()
      .then((items) => {
        if (!cancelled) setState({ items, loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          items: [],
          loading: false,
          error: e instanceof Error ? e.message : "Не вдалося завантажити схеми",
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

  /** Зберегти (нову або правку) і перечитати: список — джерело правди. */
  const save = useCallback(
    async (input: ThemeSchemeInput): Promise<void> => {
      await themesApi.save(input);
      reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      await themesApi.remove(id);
      reload();
    },
    [reload],
  );

  return { ...state, reload, save, remove };
}
