/**
 * Sites Page — список всіх сайтів з фільтрами (admin).
 *
 * @module web-admin-dev/src/pages/sites/SitesPage
 */

import { useState, useEffect, useCallback } from "react";
import type { Site } from "@wwwuabot/shared";
import { SITE_STATUS_LABELS, SITE_STATUS_BADGE_CLASS } from "@wwwuabot/shared";
import { Icon } from "@wwwuabot/shared";

type StatusFilter = "" | "draft" | "pending" | "published" | "rejected";

export function SitesPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");

  const loadSites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/sites?${params}`);
      if (!res.ok) throw new Error("Failed to load sites");
      const data = await res.json();
      if (data.success) {
        setSites(data.sites);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetching: setState in loadSites()
    loadSites();
  }, [loadSites]);

  const handleApprove = async (slug: string) => {
    if (!confirm(`Схвалити сайт "${slug}"?`)) return;
    try {
      const res = await fetch(`/api/admin/sites/${slug}/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to approve");
      loadSites();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Помилка");
    }
  };

  const handleReject = async (slug: string) => {
    const reason = prompt("Причина відхилення (необов'язково):");
    try {
      const res = await fetch(`/api/admin/sites/${slug}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      loadSites();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Помилка");
    }
  };

  return (
    <>
      <div className="page-topbar">
        <h1 className="topbar-title">
          <Icon name="layout" size={20} />
          Сайти
        </h1>
      </div>

      <div style={{ padding: "var(--sp-5)" }}>
        {/* Фільтри */}
        <div style={{ display: "flex", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
          {(["", "draft", "pending", "published", "rejected"] as StatusFilter[]).map((s) => (
            <button
              key={s || "all"}
              className={`wb-btn wb-btn-sm ${statusFilter === s ? "wb-btn-primary" : "wb-btn-ghost"}`}
              onClick={() => setStatusFilter(s)}
            >
              {s ? SITE_STATUS_LABELS[s] : "Всі"}
            </button>
          ))}
        </div>

        {/* Завантаження */}
        {loading && (
          <div className="wb-empty">
            <div className="wb-skeleton" style={{ width: 200, height: 24 }} />
            <p className="wb-text-muted">Завантаження...</p>
          </div>
        )}

        {/* Помилка */}
        {error && (
          <div className="wb-empty">
            <Icon name="x" size={32} />
            <p className="wb-text-red">{error}</p>
            <button className="wb-btn wb-btn-secondary" onClick={loadSites}>
              Спробувати знову
            </button>
          </div>
        )}

        {/* Таблиця */}
        {!loading && !error && (
          <div className="wb-card">
            <div className="wb-card-body" style={{ padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    <th style={thStyle}>Назва</th>
                    <th style={thStyle}>Slug</th>
                    <th style={thStyle}>Статус</th>
                    <th style={thStyle}>Власник</th>
                    <th style={thStyle}>Опубліковано</th>
                    <th style={thStyle}>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((site) => (
                    <tr key={site.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 500 }}>{site.title}</span>
                        {site.description && (
                          <span className="wb-text-xs wb-text-muted" style={{ display: "block" }}>
                            {site.description.slice(0, 60)}
                          </span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        <code className="wb-text-sm">/{site.slug}</code>
                      </td>
                      <td style={tdStyle}>
                        <span
                          className={
                            SITE_STATUS_BADGE_CLASS[site.status] ?? "wb-badge wb-badge-neutral"
                          }
                        >
                          {SITE_STATUS_LABELS[site.status] ?? site.status}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span className="wb-text-sm">#{site.ownerId}</span>
                      </td>
                      <td style={tdStyle}>
                        <span className="wb-text-sm wb-text-muted">
                          {site.publishedAt
                            ? new Date(site.publishedAt).toLocaleDateString("uk-UA")
                            : "—"}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                        {site.status === "pending" && (
                          <>
                            <button
                              className="wb-btn wb-btn-sm wb-btn-primary"
                              style={{ marginRight: "var(--sp-1)" }}
                              onClick={() => handleApprove(site.slug)}
                            >
                              <Icon name="check" size={14} />
                            </button>
                            <button
                              className="wb-btn wb-btn-sm wb-btn-danger"
                              onClick={() => handleReject(site.slug)}
                            >
                              <Icon name="x" size={14} />
                            </button>
                          </>
                        )}
                        {site.status !== "pending" && (
                          <span className="wb-text-xs wb-text-muted">
                            {site.status === "published" ? (
                              <Icon name="eye" size={14} />
                            ) : (
                              <Icon name="edit" size={14} />
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {sites.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ ...tdStyle, textAlign: "center" }}>
                        <Icon name="layout" size={32} />
                        <p className="wb-text-muted" style={{ marginTop: "var(--sp-2)" }}>
                          Немає сайтів
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const thStyle: React.CSSProperties = {
  padding: "var(--sp-3) var(--sp-4)",
  textAlign: "left",
  fontSize: "var(--text-xs)",
  fontWeight: 600,
  color: "var(--text-secondary)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "var(--sp-3) var(--sp-4)",
  fontSize: "var(--text-sm)",
  verticalAlign: "middle",
};
