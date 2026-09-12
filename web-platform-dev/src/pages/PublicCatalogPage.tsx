/**
 * Public Catalog — публічний каталог опублікованих сайтів.
 *
 * @module web-platform-dev/src/pages/PublicCatalogPage
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { CatalogSite } from "@wwwuabot/shared/types/site";
import { Icon } from "@wwwuabot/shared";
import { apiFetchRaw } from "@/shared/api/client";

export function PublicCatalogPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<CatalogSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Завантаження каталогу
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetchRaw(`/api/catalog?page=${page}&limit=${limit}`);
        if (!res.ok) throw new Error("Failed to load catalog");
        const data = await res.json();
        if (!cancelled && data.success) {
          setSites(data.sites);
          setTotal(data.total);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Помилка завантаження");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page]);

  // Перегляд сайту
  const handleViewSite = (slug: string) => {
    navigate(`/view/${slug}`);
  };

  if (loading) {
    return (
      <div className="wb-empty">
        <div className="wb-skeleton" style={{ width: 200, height: 24 }} />
        <p className="wb-text-muted">Завантаження каталогу...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wb-empty">
        <Icon name="x" size={32} />
        <p className="wb-text-red">{error}</p>
        <button className="wb-btn wb-btn-secondary" onClick={() => window.location.reload()}>
          Спробувати знову
        </button>
      </div>
    );
  }

  return (
    <div className="wb-page">
      <div className="wb-page-head">
        <h1 className="wb-page-title">Публічний каталог</h1>
      </div>

      {sites.length === 0 ? (
        <div className="wb-empty">
          <Icon name="layout" size={48} />
          <p className="wb-text-muted">Ще немає опублікованих сайтів</p>
        </div>
      ) : (
        <>
          <div className="wb-cards-grid">
            {sites.map((site) => (
              <div
                key={site.slug}
                className="wb-card"
                style={{ cursor: "pointer" }}
                onClick={() => handleViewSite(site.slug)}
              >
                {site.thumbnail && (
                  <div
                    style={{
                      height: 160,
                      background: `url(${site.thumbnail}) center/cover`,
                      borderRadius: "var(--radius-md) var(--radius-md) 0 0",
                    }}
                  />
                )}
                <div className="wb-card-header">
                  <span className="wb-card-title">{site.title}</span>
                </div>
                <div className="wb-card-body">
                  <p className="wb-text-muted wb-text-sm">{site.description || "Без опису"}</p>
                </div>
                <div className="wb-card-footer">
                  <span className="wb-text-xs wb-text-muted">
                    {new Date(site.publishedAt).toLocaleDateString("uk-UA")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Пагінація */}
          {total > limit && (
            <div
              className="wb-flex-center"
              style={{ marginTop: "var(--sp-5)", gap: "var(--sp-2)" }}
            >
              <button
                className="wb-btn wb-btn-secondary wb-btn-sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Попередня
              </button>
              <span className="wb-text-sm wb-text-muted">
                {page} / {Math.ceil(total / limit)}
              </span>
              <button
                className="wb-btn wb-btn-secondary wb-btn-sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(total / limit)}
              >
                Наступна
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
