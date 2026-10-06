/**
 * Крок «результати» аналізу однієї дати.
 *
 * Ознака завершеного кроку вибору — `?sys=` в адресі. Система без збереженого
 * результату рахується тут-таки: крок результатів не має просити ще раз.
 *
 * @module packages/ui/src/blocks/date-analysis/useDateAnalysis
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  analyzeDate,
  fetchAnalysis,
  fetchSystems,
  type AnalysisSystem,
  type SystemResult,
} from "../mydate/api";

export interface DateAnalysisState {
  /** `false` — систем ще не обрано, отже на екрані крок вибору. */
  chosen: boolean;
  systems: AnalysisSystem[] | null;
  analysis: Record<string, SystemResult>;
  /** Параметри з `?p=`: порожній список означає «усі», а не «жодного». */
  parameterKeys: string[];
  error: string | null;
}

/** Перелік із параметра адреси; порожній рядок — це порожній перелік. */
function listFrom(value: string | null): string[] {
  return (value ?? "").split(",").filter(Boolean);
}

export function useDateAnalysis(date: string): DateAnalysisState {
  const systemIds = useMemo(
    () => listFrom(new URLSearchParams(window.location.search).get("sys")),
    [],
  );
  const parameterKeys = useMemo(
    () => listFrom(new URLSearchParams(window.location.search).get("p")),
    [],
  );

  const [systems, setSystems] = useState<AnalysisSystem[] | null>(null);
  const [analysis, setAnalysis] = useState<Record<string, SystemResult>>({});
  const [error, setError] = useState<string | null>(null);
  // Систему рахуємо один раз за прохід екрана: інакше повторний запуск ефекту
  // (наприклад, у нерозробничому режимі React) писав би той самий рядок знову.
  const started = useRef(new Set<string>());

  useEffect(() => {
    if (systemIds.length === 0) return;
    let cancelled = false;

    void (async () => {
      try {
        const [registry, saved] = await Promise.all([fetchSystems(), fetchAnalysis(date)]);
        if (cancelled) return;

        setSystems(registry.filter((system) => systemIds.includes(system.id)));
        setAnalysis(saved);

        for (const system of registry.filter(
          (item) => systemIds.includes(item.id) && item.implemented && !saved[item.id],
        )) {
          if (started.current.has(system.id)) continue;
          started.current.add(system.id);
          const result = await analyzeDate(date, system.id);
          if (cancelled) return;
          setAnalysis((previous) => ({ ...previous, [system.id]: result }));
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Помилка аналізу");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [date, systemIds]);

  return { chosen: systemIds.length > 0, systems, analysis, parameterKeys, error };
}
