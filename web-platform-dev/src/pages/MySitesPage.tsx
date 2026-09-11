/**
 * My Sites — список сайтів користувача.
 *
 * @module web-platform-dev/src/pages/MySitesPage
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Site } from "@wwwuabot/shared/types/site";
import { SITE_STATUS_LABELS, SITE_STATUS_BADGE_CLASS } from "@wwwuabot/shared/constants/site-defaults";
import { Icon } from "@wwwuabot/shared";
import { apiFetchRaw } from "@/shared/api/client";

export function MySitesPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Завантаження сайтів
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetchRaw("/api/sites");
        if (!res.ok) throw new Error("Failed to load sites");
        const data = await res.json();
        if (!cancelled && data.success) {
          setSites(data.sites);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Помилка завантаження");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Створення нового сайту
  const handleCreateSite = () => {
    navigate("/sites/new");
  };

  // Перехід до редактора
  const handleEditSite = (slug: string) => {
    navigate(`/sites/${slug}`);
  };

  if (loading) {
    return (
      <div className="wb-empty">
        <div className="wb-skeleton" style={{ width: 200, height: 24 }} />
        <p className="wb-text-muted">Завантаження...</p>
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
    <div className="my-sites-page" style={{ padding: "var(--sp-5)" }}>
      <div className="wb-flex-between" style={{ marginBottom: "var(--sp-5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-3)" }}>
          <h1 style={{ margin: 0, fontSize: "var(--text-xl)", fontWeight: "var(--weight-bold)" }}>
            Мої сайти
          </h1>
          <span className="wb-badge wb-badge-neutral">{sites.length}</span>
        </div>
        <div style={{ display: "flex", gap: "var(--sp-2)" }}>
          <button
            className="wb-btn wb-btn-secondary"
            onClick={() => navigate("/catalog")}
          >
            <Icon name="eye" size={14} />
            Каталог
          </button>
          <button className="wb-btn wb-btn-primary" onClick={handleCreateSite}>
            <Icon name="plus" size={16} />
            Створити сайт
          </button>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="wb-empty">
          <Icon name="layout" size={48} />
          <p className="wb-text-muted">У вас ще немає сайтів</p>
          <button className="wb-btn wb-btn-primary" onClick={handleCreateSite}>
            Створити перший сайт
          </button>
        </div>
      ) : (
        <div className="wb-cards-grid">
          {sites.map((site) => (
            <div key={site.id} className="wb-card" style={{ cursor: "pointer" }} onClick={() => handleEditSite(site.slug)}>
              <div className="wb-card-header">
                <span className="wb-card-title">{site.title}</span>
                <span className={SITE_STATUS_BADGE_CLASS[site.status] ?? "wb-badge wb-badge-neutral"}>
                  {SITE_STATUS_LABELS[site.status] ?? site.status}
                </span>
              </div>
              <div className="wb-card-body">
                <p className="wb-text-muted wb-text-sm">
                  {site.description || "Без опису"}
                </p>
                <p className="wb-text-xs" style={{ marginTop: "var(--sp-2)", color: "var(--text-muted)" }}>
                  /{site.slug}
                </p>
                {site.status === "rejected" && site.rejectReason && (
                  <div style={{
                    marginTop: "var(--sp-2)",
                    padding: "var(--sp-2)",
                    background: "var(--red-dim)",
                    borderRadius: "var(--radius-sm)",
                  }}>
                    <p className="wb-text-xs wb-text-red" style={{ margin: 0 }}>
                      {site.rejectReason}
                    </p>
                  </div>
                )}
              </div>
              <div className="wb-card-footer">
                <span className="wb-text-xs wb-text-muted">
                  Оновлено: {new Date(site.updatedAt).toLocaleDateString("uk-UA")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
