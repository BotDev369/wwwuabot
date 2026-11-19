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

export function useDossiers(dates: readonly string[], kinds: readonly string[]): DossiersState {
  const [dossiers, setDossiers] = useState<DossierRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const datesKey = dates.join(",");
  const kindsKey = kinds.join(",");

  useEffect(() => {
    const list = datesKey ? datesKey.split(",") : [];
    if (list.length === 0) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchDossiers(list, kindsKey)
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
  }, [datesKey, kindsKey]);

  return { dossiers, loading, error };
}
