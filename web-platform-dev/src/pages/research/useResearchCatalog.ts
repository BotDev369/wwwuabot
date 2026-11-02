/**
 * Каталог дослідження для розділу: один запит на екран, `null` — не дочитався.
 *
 * @module web-platform-dev/src/pages/research/useResearchCatalog
 */

import { useEffect, useState } from "react";
import type { ResearchCatalog } from "@wwwuabot/shared/research";
import { researchApi } from "@/shared/api/research.api";

export interface ResearchCatalogState {
  catalog: ResearchCatalog | null;
  loading: boolean;
}

export function useResearchCatalog(): ResearchCatalogState {
  const [catalog, setCatalog] = useState<ResearchCatalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    researchApi
      .catalog()
      .then((result) => {
        if (!cancelled) setCatalog(result);
      })
      .catch(() => {
        /* мовчки: екран показує стан «ще не опубліковане», а не помилку */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { catalog, loading };
}
