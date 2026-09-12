/**
 * useSiteData — завантаження сайту та його сторінок.
 *
 * Тільки читання: жодних дій і жодних діалогів. Дії — в `actions.ts`,
 * стан форми — у `useSiteEditor`.
 *
 * @module web-platform-dev/src/pages/site-editor
 */

import { useCallback, useEffect, useState } from "react";
import type { Site, SitePage } from "@wwwuabot/shared/types/site";
import { apiFetchRaw } from "@/shared/api/client";
import { errorMessage } from "./form";

export interface SiteData {
  site: Site | null;
  pages: SitePage[];
  loading: boolean;
  error: string | null;
  loadSite: () => Promise<void>;
  reloadPages: () => Promise<void>;
}

export function useSiteData(slug: string | undefined): SiteData {
  const [site, setSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSite = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await apiFetchRaw(`/api/sites/${slug}`);
      if (!res.ok) throw new Error("Сайт не знайдено");
      const data = await res.json();
      if (data.success) setSite(data.site);
    } catch (e) {
      setError(errorMessage(e, "Помилка завантаження"));
    }
  }, [slug]);

  const reloadPages = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await apiFetchRaw(`/api/sites/${slug}/pages`);
      if (!res.ok) throw new Error("Не вдалося завантажити сторінки");
      const data = await res.json();
      if (data.success) setPages(data.pages);
    } catch (e) {
      setError(errorMessage(e, "Помилка завантаження сторінок"));
    }
  }, [slug]);

  useEffect(() => {
    const controller = { cancelled: false };
    void (async () => {
      setLoading(true);
      await Promise.all([loadSite(), reloadPages()]);
      if (!controller.cancelled) setLoading(false);
    })();
    return () => {
      controller.cancelled = true;
    };
  }, [loadSite, reloadPages]);

  return { site, pages, loading, error, loadSite, reloadPages };
}
