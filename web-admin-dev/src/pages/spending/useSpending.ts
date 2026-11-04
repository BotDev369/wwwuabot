/**
 * Стан екрана Є-data: читання огляду, вибір періоду й ручний перезбір.
 *
 * Період живе в адресі (`?period=`), а не в стані компонента: інакше перехід
 * із хаба на підсторінку скидав би вибраний місяць назад до останнього. Запит
 * робить хук, а не розмітка — AGENTS.md §3.
 * @module web-admin-dev/src/pages/spending/useSpending
 */

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { SpendingOverview } from "@wwwuabot/shared/spending";
import { fetchSpendingOverview, refreshSpending } from "../../shared/api/spending.api";

export interface SpendingState {
  overview: SpendingOverview | null;
  loading: boolean;
  error: string | null;
  /** Перезбір іде: кнопка заблокована, бо прогін триває хвилинами. */
  refreshing: boolean;
  reload: () => Promise<void>;
  selectPeriod: (period: string) => Promise<void>;
  refresh: (period: string) => Promise<void>;
}

export function useSpending(): SpendingState {
  const [params, setParams] = useSearchParams();
  const selected = params.get("period");
  const [overview, setOverview] = useState<SpendingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (next: string | null) => {
    setLoading(true);
    try {
      setOverview(await fetchSpendingOverview(next));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалось прочитати зібрані дані");
    } finally {
      setLoading(false);
    }
  }, []);

  const reload = useCallback(() => load(selected), [load, selected]);

  const selectPeriod = useCallback(
    async (next: string) => {
      setParams(
        (previous) => {
          const copy = new URLSearchParams(previous);
          copy.set("period", next);
          return copy;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  const refresh = useCallback(
    async (next: string) => {
      setRefreshing(true);
      try {
        const { report } = await refreshSpending(next);
        setError(report.stopped ? `Збір спинився: ${report.stopped}` : null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не вдалось перезібрати місяць");
      } finally {
        setRefreshing(false);
      }
      await load(next);
    },
    [load],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- асинхронне завантаження: setState усередині load()
    void load(selected);
  }, [load, selected]);

  return { overview, loading, error, refreshing, reload, selectPeriod, refresh };
}
