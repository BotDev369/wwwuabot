/**
 * Стан досьє: один запит на всі дати екрана. Помилка не ковтається — екран
 * мусить сказати, що аналіз не приїхав, а не показати порожні домени.
 *
 * @module packages/ui/src/blocks/date-analysis/useDossiers
 */

import { useEffect, useState } from "react";
import { fetchDossiers, type DossierRead } from "./api";

export interface DossiersState {
  dossiers: DossierRead[];
  loading: boolean;
  error: string | null;
}

export function useDossiers(
  dates: readonly string[],
  kinds: readonly string[],
  lenses: readonly string[],
): DossiersState {
  const [dossiers, setDossiers] = useState<DossierRead[]>([]);
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
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchDossiers(list, kindsKey, selected)
      .then((result) => {
        if (!cancelled) setDossiers(result);
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
  }, [datesKey, kindsKey, lensesKey]);

  return { dossiers, loading, error };
}
