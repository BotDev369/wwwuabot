/**
 * Site View — публічний перегляд опублікованого сайту.
 *
 * @module web-platform-dev/src/pages/SiteViewPage
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import type { Site, SitePage } from "@wwwuabot/shared/types/site";
import { SiteRenderer } from "@wwwuabot/ui/SiteRenderer";
import { Icon } from "@wwwuabot/shared";

export function SiteViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const [site, setSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/catalog/${slug}`);
        if (!res.ok) throw new Error("Site not found");
        const data = await res.json();
        if (!cancelled && data.success) {
          setSite(data.site);
          setPages(data.pages);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Сайт не знайдено");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) {
    return (
      <div className="wb-empty">
        <div className="wb-skeleton" style={{ width: 200, height: 24 }} />
        <p className="wb-text-muted">Завантаження...</p>
      </div>
    );
  }

  if (error || !site) {
    return (
      <div className="wb-empty">
        <Icon name="x" size={48} />
        <h2 style={{ margin: 0 }}>404</h2>
        <p className="wb-text-muted">{error || "Сайт не знайдено"}</p>
      </div>
    );
  }

  return (
    <SiteRenderer
      site={site}
      pages={pages}
      mode="public"
    />
  );
}
