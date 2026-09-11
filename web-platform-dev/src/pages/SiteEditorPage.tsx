/**
 * Site Editor — редактор сайту зі списком сторінок, навігацією та налаштуваннями.
 *
 * @module web-platform-dev/src/pages/SiteEditorPage
 */

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import type { Site, SitePage, NavigationItem } from "@wwwuabot/shared/types/site";
import {
  SITE_STATUS_LABELS,
  SITE_STATUS_BADGE_CLASS,
  isValidSlug,
} from "@wwwuabot/shared/constants/site-defaults";
import { Icon } from "@wwwuabot/shared";
import { SiteRenderer } from "@wwwuabot/ui/SiteRenderer";
import { apiFetchRaw } from "@/shared/api/client";

// ── Types ────────────────────────────────────────────────────

type Tab = "pages" | "navigation" | "settings" | "preview";

// ── Component ────────────────────────────────────────────────

export function SiteEditorPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [site, setSite] = useState<Site | null>(null);
  const [pages, setPages] = useState<SitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("pages");
  const [editingPageSlug, setEditingPageSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Settings state
  const [settingsTitle, setSettingsTitle] = useState("");
  const [settingsDesc, setSettingsDesc] = useState("");
  const [settingsTheme, setSettingsTheme] = useState<"light" | "dark" | "auto">("auto");
  const [settingsLogo, setSettingsLogo] = useState("");
  const [settingsColor, setSettingsColor] = useState("");
  const [settingsIsPublic, setSettingsIsPublic] = useState(false);

  // Navigation state
  const [navItems, setNavItems] = useState<NavigationItem[]>([]);

  const loadSite = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await apiFetchRaw(`/api/sites/${slug}`);
      if (!res.ok) throw new Error("Site not found");
      const data = await res.json();
      if (data.success) {
        setSite(data.site);
        setSettingsTitle(data.site.title);
        setSettingsDesc(data.site.description ?? "");
        setSettingsTheme(data.site.settings?.theme ?? "auto");
        setSettingsLogo(data.site.settings?.logo ?? "");
        setSettingsColor(data.site.settings?.primaryColor ?? "");
        setSettingsIsPublic(data.site.isPublic);
        setNavItems(data.site.settings?.navigation ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка завантаження");
    }
  }, [slug]);

  const loadPages = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await apiFetchRaw(`/api/sites/${slug}/pages`);
      if (!res.ok) throw new Error("Failed to load pages");
      const data = await res.json();
      if (data.success) {
        setPages(data.pages);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка завантаження сторінок");
    }
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([loadSite(), loadPages()]);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadSite, loadPages]);

  // ── Page actions ────────────────────────────────────────

  const handleAddPage = async () => {
    const title = prompt("Назва сторінки:");
    if (!title?.trim()) return;

    const pageSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/[\s_]+/gu, "-")
      .replace(/-+/gu, "-")
      .replace(/^-|-$/gu, "")
      .slice(0, 64);

    if (!isValidSlug(pageSlug)) {
      alert("Невалідний slug");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetchRaw(`/api/sites/${slug}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: pageSlug, title: title.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create page");
      }
      await loadPages();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Помилка створення");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePage = async (pageId: string, pageSlug: string) => {
    if (pageSlug === "home") {
      alert("Неможливо видалити головну сторінку");
      return;
    }
    if (!confirm(`Видалити сторінку "${pageSlug}"?`)) return;

    try {
      const res = await apiFetchRaw(`/api/sites/${slug}/pages/${pageId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete page");
      await loadPages();
      if (editingPageSlug === pageSlug) {
        setEditingPageSlug(null);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Помилка видалення");
    }
  };

  // ── Settings save ───────────────────────────────────────

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await apiFetchRaw(`/api/sites/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: settingsTitle,
          description: settingsDesc || undefined,
          isPublic: settingsIsPublic,
          settings: {
            theme: settingsTheme,
            logo: settingsLogo,
            primaryColor: settingsColor,
            navigation: navItems,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      await loadSite();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Помилка збереження");
    } finally {
      setSaving(false);
    }
  };

  // ── Navigation actions ──────────────────────────────────

  const handleAddNavItem = () => {
    const label = prompt("Назва пункту меню:");
    if (!label?.trim()) return;

    const pageSlug = prompt("Slug сторінки:");
    if (!pageSlug?.trim() || !isValidSlug(pageSlug.trim())) {
      alert("Невалідний slug сторінки");
      return;
    }

    const exists = pages.find((p) => p.slug === pageSlug.trim());
    if (!exists) {
      alert(`Сторінка "/${pageSlug.trim()}" не існує. Створіть її спочатку.`);
      return;
    }

    setNavItems([
      ...navItems,
      {
        label: label.trim(),
        pageSlug: pageSlug.trim(),
        order: navItems.length,
      },
    ]);
  };

  const handleRemoveNavItem = (index: number) => {
    setNavItems(navItems.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i })));
  };

  // ── Publish ─────────────────────────────────────────────

  const handlePublish = async () => {
    if (!confirm("Подати сайт на модерацію?")) return;

    setSaving(true);
    try {
      const res = await apiFetchRaw(`/api/sites/${slug}/publish`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish");
      }
      await loadSite();
      alert("Сайт подано на модерацію!");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Помилка публікації");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading / Error ─────────────────────────────────────

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
        <Icon name="x" size={32} />
        <p className="wb-text-red">{error || "Сайт не знайдено"}</p>
        <button className="wb-btn wb-btn-secondary" onClick={() => navigate("/sites")}>
          Назад до списку
        </button>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="site-editor-page" style={{ display: "flex", height: "100vh" }}>
      {/* Бічна панель */}
      <div style={{
        width: 320,
        borderRight: "1px solid var(--border-subtle)",
        background: "var(--surface)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}>
        {/* Заголовок */}
        <div style={{ padding: "var(--sp-4)", borderBottom: "1px solid var(--border-subtle)" }}>
          <div className="wb-flex-between" style={{ marginBottom: "var(--sp-2)" }}>
            <h2 style={{ margin: 0, fontSize: "var(--text-md)", fontWeight: "var(--weight-bold)" }}>
              {site.title}
            </h2>
            <span className={SITE_STATUS_BADGE_CLASS[site.status] ?? "wb-badge wb-badge-neutral"}>
              {SITE_STATUS_LABELS[site.status] ?? site.status}
            </span>
          </div>
          <p className="wb-text-xs wb-text-muted">/{site.slug}</p>
        </div>

        {/* Таби */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)" }}>
          {(["pages", "navigation", "settings", "preview"] as Tab[]).map((tab) => (
            <button
              key={tab}
              className={`wb-btn wb-btn-ghost ${activeTab === tab ? "wb-btn-primary" : ""}`}
              style={{ flex: 1, borderRadius: 0, borderBottom: activeTab === tab ? "2px solid var(--accent)" : "2px solid transparent", fontSize: "var(--text-xs)" }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "pages" && "Сторінки"}
              {tab === "navigation" && "Меню"}
              {tab === "settings" && "Налашт."}
              {tab === "preview" && "Перегляд"}
            </button>
          ))}
        </div>

        {/* Контент табу */}
        <div style={{ flex: 1, overflow: "auto", padding: "var(--sp-4)" }}>
          {/* TAB: Pages */}
          {activeTab === "pages" && (
            <div>
              <div className="wb-flex-between" style={{ marginBottom: "var(--sp-3)" }}>
                <span className="wb-text-sm wb-text-secondary">Сторінки ({pages.length})</span>
                <button
                  className="wb-btn wb-btn-sm wb-btn-primary"
                  onClick={handleAddPage}
                  disabled={saving}
                >
                  <Icon name="plus" size={14} />
                  Додати
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
                {pages.map((page) => (
                  <div
                    key={page.id}
                    className="wb-card"
                    style={{
                      cursor: "pointer",
                      borderColor: editingPageSlug === page.slug ? "var(--accent)" : undefined,
                    }}
                    onClick={() => setEditingPageSlug(page.slug)}
                  >
                    <div className="wb-card-body" style={{ padding: "var(--sp-3)" }}>
                      <div className="wb-flex-between">
                        <span className="wb-text-sm" style={{ fontWeight: "var(--weight-medium)" }}>
                          {page.title}
                        </span>
                        {page.slug !== "home" && (
                          <button
                            className="wb-btn wb-btn-ghost wb-btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePage(page.id, page.slug);
                            }}
                            style={{ padding: "var(--sp-1)", minWidth: "auto" }}
                          >
                            <Icon name="trash" size={14} />
                          </button>
                        )}
                      </div>
                      <span className="wb-text-xs wb-text-muted">/{page.slug}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: Navigation */}
          {activeTab === "navigation" && (
            <div>
              <div className="wb-flex-between" style={{ marginBottom: "var(--sp-3)" }}>
                <span className="wb-text-sm wb-text-secondary">Пункти меню ({navItems.length})</span>
                <button
                  className="wb-btn wb-btn-sm wb-btn-primary"
                  onClick={handleAddNavItem}
                >
                  <Icon name="plus" size={14} />
                  Додати
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
                {[...navItems]
                  .sort((a, b) => a.order - b.order)
                  .map((item, idx) => (
                    <div key={item.pageSlug} className="wb-card">
                      <div className="wb-card-body" style={{ padding: "var(--sp-3)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span className="wb-text-sm" style={{ fontWeight: 500 }}>
                            {item.label}
                          </span>
                          <span className="wb-text-xs wb-text-muted" style={{ display: "block" }}>
                            → /{item.pageSlug}
                          </span>
                        </div>
                        <button
                          className="wb-btn wb-btn-ghost wb-btn-sm"
                          onClick={() => handleRemoveNavItem(idx)}
                          style={{ padding: "var(--sp-1)", minWidth: "auto" }}
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                {navItems.length === 0 && (
                  <p className="wb-text-sm wb-text-muted">Додайте пункти меню для навігації між сторінками</p>
                )}
              </div>
            </div>
          )}

          {/* TAB: Settings */}
          {activeTab === "settings" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
              <div>
                <label className="wb-label">Назва сайту</label>
                <input
                  className="wb-input"
                  value={settingsTitle}
                  onChange={(e) => setSettingsTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="wb-label">Опис</label>
                <textarea
                  className="wb-textarea"
                  value={settingsDesc}
                  onChange={(e) => setSettingsDesc(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <label className="wb-label">Тема</label>
                <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                  {(["auto", "light", "dark"] as const).map((t) => (
                    <button
                      key={t}
                      className={`wb-btn wb-btn-sm ${settingsTheme === t ? "wb-btn-primary" : "wb-btn-ghost"}`}
                      onClick={() => setSettingsTheme(t)}
                    >
                      {t === "auto" ? "Авто" : t === "light" ? "Світла" : "Темна"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="wb-label">URL логотипу</label>
                <input
                  className="wb-input"
                  value={settingsLogo}
                  onChange={(e) => setSettingsLogo(e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="wb-label">Основний колір (hex)</label>
                <input
                  className="wb-input"
                  value={settingsColor}
                  onChange={(e) => setSettingsColor(e.target.value)}
                  placeholder="#4A90D9"
                />
              </div>
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={settingsIsPublic}
                    onChange={(e) => setSettingsIsPublic(e.target.checked)}
                  />
                  <span className="wb-text-sm">Додати в публічний каталог</span>
                </label>
              </div>
              <button
                className="wb-btn wb-btn-primary"
                onClick={handleSaveSettings}
                disabled={saving}
              >
                <Icon name="check" size={14} />
                {saving ? "Збереження..." : "Зберегти"}
              </button>
            </div>
          )}

          {/* TAB: Preview */}
          {activeTab === "preview" && (
            <div>
              {pages.length > 0 ? (
                <SiteRenderer
                  site={site}
                  pages={pages}
                  mode="preview"
                  className="site-preview"
                />
              ) : (
                <p className="wb-text-muted">Спочатку додайте сторінки</p>
              )}
            </div>
          )}
        </div>

        {/* Кнопки дій */}
        <div style={{ padding: "var(--sp-4)", borderTop: "1px solid var(--border-subtle)" }}>
          <button
            className="wb-btn wb-btn-primary"
            style={{ width: "100%" }}
            onClick={handlePublish}
            disabled={saving || site.status === "pending"}
          >
            {site.status === "pending" ? "На модерації" : "Опублікувати"}
          </button>
        </div>
      </div>

      {/* Основна область */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {editingPageSlug ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {/* Заголовок сторінки */}
            <div style={{ padding: "var(--sp-3) var(--sp-4)", borderBottom: "1px solid var(--border-subtle)" }}>
              <div className="wb-flex-between">
                <span className="wb-text-sm">
                  Редагування: <strong>/{editingPageSlug}</strong>
                </span>
                <button
                  className="wb-btn wb-btn-sm wb-btn-ghost"
                  onClick={() => setEditingPageSlug(null)}
                >
                  <Icon name="close" size={14} />
                </button>
              </div>
            </div>

            {/* PageBuilder інтеграція */}
            <div style={{ flex: 1, padding: "var(--sp-4)", overflow: "auto" }}>
              <PageBuilderPlaceholder
                siteSlug={site.slug}
                pageSlug={editingPageSlug}
                pages={pages}
                onSaved={() => {
                  loadPages();
                }}
              />
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div className="wb-empty">
              <Icon name="edit" size={48} />
              <p className="wb-text-muted">Оберіть сторінку для редагування</p>
              <p className="wb-text-xs wb-text-muted" style={{ marginTop: "var(--sp-2)" }}>
                Або перейдіть на вкладку «Меню» для налаштування навігації
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page Builder Placeholder ──────────────────────────────────

/**
 * Тимчасовий компонент для редагування блоків сторінки.
 * Буде замінений на повноцінний PageBuilder з packages/ui.
 *
 * `siteSlug` та `onSaved` поки не потрібні, але лишаються в контракті:
 * їх передає виклик, і вони знадобляться повноцінному редакторові.
 */
function PageBuilderPlaceholder({
  pageSlug,
  pages,
}: {
  siteSlug: string;
  pageSlug: string;
  pages: SitePage[];
  onSaved: () => void;
}) {
  const page = pages.find((p) => p.slug === pageSlug);
  const [blockCount, setBlockCount] = useState(0);

  useEffect(() => {
    if (!page) return;
    // Count blocks across all zones
    const pd = page.pageData;
    if (pd?.zones) {
      const count = Object.values(pd.zones).reduce(
        (sum, zone) => sum + (Array.isArray(zone) ? zone.length : 0),
        0,
      );
      setBlockCount(count);
    }
  }, [page]);

  if (!page) {
    return (
      <div className="wb-empty">
        <Icon name="x" size={32} />
        <p className="wb-text-muted">Сторінку не знайдено</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      {/* Header */}
      <div className="wb-card">
        <div className="wb-card-body" style={{ padding: "var(--sp-4)" }}>
          <div className="wb-flex-between" style={{ marginBottom: "var(--sp-2)" }}>
            <h3 style={{ margin: 0, fontSize: "var(--text-md)" }}>
              {page.title}
            </h3>
            <span className="wb-badge wb-badge-neutral">
              {blockCount} блок{blockCount === 1 ? "" : blockCount < 5 ? "и" : "ів"}
            </span>
          </div>
          <p className="wb-text-xs wb-text-muted">
            Slug: /{pageSlug} · Створено: {new Date(page.createdAt).toLocaleDateString("uk-UA")}
          </p>
        </div>
      </div>

      {/* Blocks list */}
      <div className="wb-card">
        <div className="wb-card-header">
          <h4 style={{ margin: 0, fontSize: "var(--text-sm)" }}>Блоки сторінки</h4>
        </div>
        <div className="wb-card-body">
          {page.pageData?.zones?.main && page.pageData.zones.main.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-2)" }}>
              {page.pageData.zones.main.map((block) => (
                <div
                  key={block.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "var(--sp-3)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div>
                    <span className="wb-text-sm" style={{ fontWeight: 500 }}>
                      {block.type}
                    </span>
                    {typeof block.props?.title === "string" && (
                      <span className="wb-text-xs wb-text-muted" style={{ marginLeft: "var(--sp-2)" }}>
                        {String(block.props.title).slice(0, 40)}
                      </span>
                    )}
                  </div>
                  <span className="wb-text-xs wb-text-muted">
                    #{block.id.slice(0, 8)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="wb-text-sm wb-text-muted">
              Сторінка порожня. Додайте блоки через конструктор.
            </p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: "flex", gap: "var(--sp-2)" }}>
        <button className="wb-btn wb-btn-primary">
          <Icon name="edit" size={14} />
          Редагувати блоки
        </button>
        <button className="wb-btn wb-btn-secondary">
          <Icon name="eye" size={14} />
          Попередній перегляд
        </button>
      </div>

      <p className="wb-text-xs wb-text-muted" style={{ textAlign: "center" }}>
        Повноцінний PageBuilder буде додано в наступних фазах ( packages/ui → SiteRenderer інтеграція )
      </p>
    </div>
  );
}
