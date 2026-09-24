/**
 * Стан сторінки моніторингу: читання зрізів і ручний збір.
 *
 * Компонент не робить запитів сам (AGENTS.md §3: сторінка лише рендерить) — і
 * саме тому збір і читання розділені: поки збір іде, сторінка показує вже
 * зібране, а не порожній екран.
 *
 * @module web-admin-dev/src/pages/monitoring/useMonitoring
 */

import { useCallback, useEffect, useState } from "react";
import type { MonitoringSummary } from "@wwwuabot/shared/monitoring";
import { collectMonitoringSnapshot, fetchMonitoringSummary } from "../../shared/api/monitoring.api";

export interface MonitoringState {
  summary: MonitoringSummary | null;
  loading: boolean;
  collecting: boolean;
  error: string | null;
  reload: () => Promise<void>;
  collect: () => Promise<void>;
}

export function useMonitoring(): MonitoringState {
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setSummary(await fetchMonitoringSummary());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалось прочитати зрізи");
    } finally {
      setLoading(false);
    }
  }, []);

  const collect = useCallback(async () => {
    setCollecting(true);
    setError(null);
    try {
      await collectMonitoringSnapshot();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалось зібрати зріз");
    } finally {
      setCollecting(false);
    }
  }, [reload]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- асинхронне завантаження: setState усередині reload()
    void reload();
  }, [reload]);

  return { summary, loading, collecting, error, reload, collect };
}
