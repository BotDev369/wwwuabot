/**
 * Стан екрана Є-data: читання огляду й вибір періоду.
 *
 * Компонент не робить запитів сам (AGENTS.md §3) — і саме тому період живе
 * тут, а не в розмітці: вибір місяця це стан запиту, а не вигляд.
 * @module web-admin-dev/src/pages/spending/useSpending
 */

import { useCallback, useEffect, useState } from "react";
import type { SpendingOverview } from "@wwwuabot/shared/spending";
import { fetchSpendingOverview } from "../../shared/api/spending.api";

export interface SpendingState {
  overview: SpendingOverview | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  selectPeriod: (period: string) => Promise<void>;
}

export function useSpending(): SpendingState {
  const [overview, setOverview] = useState<SpendingOverview | null>(null);
  const [period, setPeriod] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

  const reload = useCallback(() => load(period), [load, period]);

  const selectPeriod = useCallback(
    (next: string) => {
      setPeriod(next);
      return load(next);
    },
    [load],
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- асинхронне завантаження: setState усередині load()
    void load(null);
  }, [load]);

  return { overview, loading, error, reload, selectPeriod };
}
