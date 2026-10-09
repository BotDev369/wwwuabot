/**
 * Стан вітрини систем: сам реєстр і те, чи він уже приїхав.
 *
 * Рендеринг — у `AnalysisSystemsBlock`, а запит — у тому самому клієнті
 * `/api/mydate/*`, що й таблиця аналізу.
 *
 * @module packages/ui/src/blocks/analysis-systems/useAnalysisSystems
 */

import { useEffect, useState } from "react";
import { fetchSystems, type AnalysisSystem } from "../date-analysis/api";

export interface AnalysisSystemsState {
  systems: AnalysisSystem[];
  loading: boolean;
  error: string | null;
}

export function useAnalysisSystems(): AnalysisSystemsState {
  const [systems, setSystems] = useState<AnalysisSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSystems()
      .then((list) => {
        if (!cancelled) setSystems(list);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Помилка мережі");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { systems, loading, error };
}
