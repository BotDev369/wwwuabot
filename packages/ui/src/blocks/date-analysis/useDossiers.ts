/**
 * Стан досьє: один запит на всі дати екрана. Помилка не ковтається — екран
 * каже, що аналіз не приїхав, а не показує порожні домени.
 *
 * Обидва вектори їдуть одним запитом: це один екран і одне читання ядра,
 * а два запити дали б два стани завантаження на одній сторінці.
 * @module packages/ui/src/blocks/date-analysis/useDossiers
 */

import { useEffect, useState } from "react";
import { fetchDossiers, type DossierRead, type SurveyRead } from "./api";

export interface DossiersState {
  dossiers: DossierRead[];
  survey: SurveyRead | null;
  loading: boolean;
  error: string | null;
}

export function useDossiers(
  dates: readonly string[],
  kinds: readonly string[],
  lenses: readonly string[],
  survey: boolean,
): DossiersState {
  const [dossiers, setDossiers] = useState<DossierRead[]>([]);
  const [measured, setMeasured] = useState<SurveyRead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const datesKey = dates.join(",");
  const kindsKey = kinds.join(",");
  const lensesKey = lenses.join(",");

  useEffect(() => {
    const list = datesKey ? datesKey.split(",") : [];
    const selected = lensesKey ? lensesKey.split(",") : [];
    if (list.length === 0 || selected.length === 0) {
      setDossiers([]);
      setMeasured(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchDossiers(list, kindsKey, selected, survey)
      .then((result) => {
        if (cancelled) return;
        setDossiers(result.dossiers);
        setMeasured(result.survey);
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
  }, [datesKey, kindsKey, lensesKey, survey]);

  return { dossiers, survey: measured, loading, error };
}
