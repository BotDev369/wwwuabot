/**
 * Оголошення для дошки: чуже й своє.
 *
 * Два запити — і це не надлишок: дошка **публічна** (без власника в запиті), а
 * власний список іде з-під підписаного `initData` і містить чернетки. Один
 * запит на обидва мусив би або відкрити чернетки всім, або сховати від людини
 * її ж написи.
 *
 * **Після запису список перечитується, але не порожніє.** Дошка залежить від
 * чужого вибору, тож після власної правки її треба перечитати — і зробити це
 * треба без «блимання»: якби ми ставили `loading`, список зникав би саме тоді,
 * коли людина щойно щось зберегла.
 *
 * @module web-platform-dev/src/pages/useAds
 */

import { useCallback, useEffect, useState } from "react";
import type { AdDraft } from "@wwwuabot/shared/ads";
import { adsApi } from "@/shared/api/ads.api";
import { composeAds, type SpaceAd } from "./ads-list";

export interface AdsState {
  items: SpaceAd[];
  loading: boolean;
  error: string | null;
}

export function useAds() {
  const [state, setState] = useState<AdsState>({ items: [], loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([adsApi.board(), adsApi.listOwn()])
      .then(([board, own]) => {
        if (cancelled) return;
        setState({ items: composeAds(board, own), loading: false, error: null });
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setState({
          items: [],
          loading: false,
          error: e instanceof Error ? e.message : "Не вдалося завантажити оголошення",
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

  /** Зберегти (нове або правку) і перечитати дошку: список — джерело правди. */
  const save = useCallback(
    async (draft: AdDraft): Promise<void> => {
      await adsApi.save(draft);
      reload();
    },
    [reload],
  );

  const remove = useCallback(
    async (id: number): Promise<void> => {
      await adsApi.remove(id);
      reload();
    },
    [reload],
  );

  return { ...state, reload, save, remove };
}
