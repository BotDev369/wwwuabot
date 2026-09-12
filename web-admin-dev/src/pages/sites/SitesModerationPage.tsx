/**
 * Sites Moderation Page — черга модерації сайтів (admin).
 *
 * @module web-admin-dev/src/pages/sites/SitesModerationPage
 */

import { useState, useEffect, useCallback } from "react";
import type { Site, SitePage } from "@wwwuabot/shared";
import { Icon } from "@wwwuabot/shared";
import { useDialog } from "@wwwuabot/ui/dialog";

export function SitesModerationPage() {
  const dialog = useDialog();
  const [pending, setPending] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Site | null>(null);
  const [selectedPages, setSelectedPages] = useState<SitePage[]>([]);
  const [rejectReason, setRejectReason] = useState("");

  const loadPending = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sites/pending");
      if (!res.ok) throw new Error("Failed to load pending sites");
      const data = await res.json();
      if (data.success) {
        setPending(data.sites);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetching: setState in loadPending()
    loadPending();
  }, [loadPending]);

  const handleSelectSite = async (site: Site) => {
    setSelected(site);
    try {
      const res = await fetch(`/api/admin/sites/${site.slug}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSelectedPages(data.pages ?? []);
        }
      }
    } catch {
      // ignore — show site without pages
    }
  };

  const handleApprove = async (slug: string) => {
    const ok = await dialog.confirm(`Схвалити публікацію «${slug}»?`, { confirmText: "Схвалити" });
    if (!ok) return;
    try {
      const res = await fetch(`/api/admin/sites/${slug}/approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to approve");
      setSelected(null);
      loadPending();
    } catch (e) {
      await dialog.alert(e instanceof Error ? e.message : "Помилка", { tone: "danger" });
    }
  };

  const handleReject = async (slug: string) => {
    try {
      const res = await fetch(`/api/admin/sites/${slug}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason || undefined }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      setSelected(null);
      setRejectReason("");
      loadPending();
    } catch (e) {
      await dialog.alert(e instanceof Error ? e.message : "Помилка", { tone: "danger" });
    }
  };

  return (
    <>
      <div className="page-topbar">
        <h1 className="topbar-title">
          <Icon name="eye" size={20} />
          Модерація сайтів
        </h1>
        <span className="wb-badge wb-badge-yellow">{pending.length} очікують</span>
      </div>

      <div className="sites-split">
        {/* Черга */}
        <div className="sites-split-queue">
          {loading && (
            <div className="wb-empty">
              <div className="wb-skeleton" style={{ width: 200, height: 24 }} />
              <p className="wb-text-muted">Завантаження...</p>
            </div>
          )}

          {error && (
            <div className="wb-empty">
              <Icon name="x" size={32} />
              <p className="wb-text-red">{error}</p>
              <button className="wb-btn wb-btn-secondary" onClick={loadPending}>
                Спробувати знову
              </button>
            </div>
          )}

          {!loading && !error && pending.length === 0 && (
            <div className="wb-empty">
              <Icon name="check" size={48} />
              <p className="wb-text-muted">Черга модерації порожня</p>
            </div>
          )}

          {!loading &&
            !error &&
            pending.map((site) => (
              <div
                key={site.id}
                className="wb-card"
                style={{
                  cursor: "pointer",
                  marginBottom: "var(--sp-2)",
                  borderColor: selected?.id === site.id ? "var(--accent)" : undefined,
                }}
                onClick={() => handleSelectSite(site)}
              >
                <div className="wb-card-body" style={{ padding: "var(--sp-3)" }}>
                  <div className="wb-flex-between">
                    <span className="wb-text-sm" style={{ fontWeight: 600 }}>
                      {site.title}
                    </span>
                    <span className="wb-badge wb-badge-yellow">pending</span>
                  </div>
                  <p className="wb-text-xs wb-text-muted" style={{ marginTop: "var(--sp-1)" }}>
                    /{site.slug} · #{site.ownerId}
                  </p>
                  {site.description && (
                    <p
                      className="wb-text-xs wb-text-secondary"
                      style={{ marginTop: "var(--sp-1)" }}
                    >
                      {site.description.slice(0, 80)}
                    </p>
                  )}
                  <p className="wb-text-xs wb-text-muted" style={{ marginTop: "var(--sp-1)" }}>
                    Оновлено: {new Date(site.updatedAt).toLocaleDateString("uk-UA")}
                  </p>
                </div>
              </div>
            ))}
        </div>

        {/* Деталі */}
        <div className="sites-split-detail">
          {!selected ? (
            <div className="wb-empty">
              <Icon name="eye" size={48} />
              <p className="wb-text-muted">Оберіть сайт з черги для перегляду</p>
            </div>
          ) : (
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
              {/* Заголовок */}
              <div className="wb-card" style={{ marginBottom: "var(--sp-4)" }}>
                <div className="wb-card-body">
                  <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontWeight: 700 }}>
                    {selected.title}
                  </h2>
                  <p className="wb-text-sm wb-text-muted" style={{ marginTop: "var(--sp-1)" }}>
                    /{selected.slug} · Власник: #{selected.ownerId}
                  </p>
                  {selected.description && (
                    <p className="wb-text-sm" style={{ marginTop: "var(--sp-2)" }}>
                      {selected.description}
                    </p>
                  )}
                </div>
              </div>

              {/* Сторінки */}
              <h3 style={{ marginBottom: "var(--sp-2)" }}>Сторінки ({selectedPages.length})</h3>
              <div style={{ display: "flex", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
                {selectedPages.map((page) => (
                  <span key={page.id} className="wb-badge wb-badge-neutral">
                    {page.title} ({page.slug})
                  </span>
                ))}
                {selectedPages.length === 0 && (
                  <p className="wb-text-xs wb-text-muted">Немає сторінок</p>
                )}
              </div>

              {/* Навігація */}
              {selected.settings?.navigation && selected.settings.navigation.length > 0 && (
                <>
                  <h3 style={{ marginBottom: "var(--sp-2)" }}>Навігація</h3>
                  <div style={{ display: "flex", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
                    {[...selected.settings.navigation]
                      .sort((a, b) => a.order - b.order)
                      .map((item) => (
                        <span key={item.pageSlug} className="wb-badge wb-badge-neutral">
                          {item.label} → /{item.pageSlug}
                        </span>
                      ))}
                  </div>
                </>
              )}

              {/* Дії */}
              <div
                style={{
                  display: "flex",
                  gap: "var(--sp-3)",
                  padding: "var(--sp-4)",
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <button
                  className="wb-btn wb-btn-primary"
                  onClick={() => handleApprove(selected.slug)}
                >
                  <Icon name="check" size={16} />
                  Схвалити
                </button>
                <button
                  className="wb-btn wb-btn-danger"
                  onClick={() => handleReject(selected.slug)}
                >
                  <Icon name="x" size={16} />
                  Відхилити
                </button>
              </div>

              {/* Причина відхилення */}
              <div style={{ marginTop: "var(--sp-3)" }}>
                <label className="wb-label">Причина відхилення (необов'язково)</label>
                <textarea
                  className="wb-textarea"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Поясніть, що потребує виправлення..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
