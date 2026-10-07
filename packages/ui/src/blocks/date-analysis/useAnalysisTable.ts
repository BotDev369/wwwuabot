/**
 * Стан таблиці аналізу: реєстр систем, рядки «параметр — значення» і тексти.
 * Рядки будуються тут, бо «які параметри показати» — це бізнес-логіка, а не
 * рендеринг (`AGENTS.md` §3).
 *
 * @module packages/ui/src/blocks/date-analysis/useAnalysisTable
 */

import { useEffect, useMemo, useState } from "react";
import {
  compareDates,
  fetchSystems,
  type AnalysisSystem,
  type CompareDetails,
  type CompareMatrix,
} from "../mydate/api";

/** Рядок таблиці — параметр однієї системи. */
export interface AnalysisRow {
  systemId: string;
  systemName: string;
  key: string;
  label: string;
  /** Пояснення параметра: воно не залежить від дати, тож беремо перше, яке прийшло. */
  about?: string;
}

export interface AnalysisTableState {
  systems: AnalysisSystem[];
  rows: AnalysisRow[];
  /** `matrix[date][systemId][parameterKey]` — значення під своєю датою. */
  matrix: CompareMatrix;
  details: CompareDetails;
  /** Назви дат (`my_dates.name`) під датою в шапці; без назви ключа немає. */
  names: Record<string, string>;
  loading: boolean;
  error: string | null;
}

export function useAnalysisTable(
  dates: string[],
  systemIds: string[],
  parameterKeys: string[],
): AnalysisTableState {
  const [systems, setSystems] = useState<AnalysisSystem[]>([]);
  const [matrix, setMatrix] = useState<CompareMatrix>({});
  const [details, setDetails] = useState<CompareDetails>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(dates.length > 0 && systemIds.length > 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Без дат таблиці немає, а без систем людина ще на кроці вибору: запит там
    // нічого не показує — він лише рахував би аналіз заздалегідь.
    if (dates.length === 0 || systemIds.length === 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSystems()
      .then((list) => {
        if (!cancelled) setSystems(list);
        return compareDates(
          dates,
          systemIds.length ? systemIds : undefined,
          parameterKeys.length ? parameterKeys : undefined,
        );
      })
      .then((result) => {
        if (cancelled) return;
        setMatrix(result.matrix);
        setDetails(result.details);
        setNames(result.names);
      })
      .catch((reason: unknown) => {
        // Повідомлення сервера каже людині, що саме не так («Немає дат»), і
        // втрачати його на користь спільного «Помилка мережі» — це дефект.
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : "Помилка мережі");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [dates, parameterKeys, systemIds]);

  const rows = useMemo(() => {
    const visible = systemIds.length
      ? systems.filter((system) => systemIds.includes(system.id) && system.implemented)
      : systems.filter((system) => system.implemented);
    const out: AnalysisRow[] = [];
    for (const system of visible) {
      for (const parameter of system.parameters ?? []) {
        if (parameterKeys.length && !parameterKeys.includes(parameter.key)) continue;
        out.push({
          systemId: system.id,
          systemName: system.name,
          key: parameter.key,
          label: parameter.label,
          about: dates
            .map((date) => details[date]?.[system.id]?.[parameter.key]?.about)
            .find(Boolean),
        });
      }
    }
    return out;
  }, [dates, details, parameterKeys, systemIds, systems]);

  return { systems, rows, matrix, details, names, loading, error };
}
