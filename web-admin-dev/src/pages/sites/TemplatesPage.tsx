/**
 * Templates Page — управління шаблонами сайтів (admin).
 *
 * @module web-admin-dev/src/pages/sites/TemplatesPage
 */

import { useState, useEffect, useCallback } from "react";
import type { Template, TemplateType } from "@wwwuabot/shared";
import { ALL_SYSTEM_TEMPLATES } from "@wwwuabot/shared";
import { Icon } from "@wwwuabot/shared";

type TypeFilter = "" | "site" | "page";

export function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<TemplateType>("page");
  const [newDesc, setNewDesc] = useState("");

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/templates?${params}`);
      if (!res.ok) throw new Error("Failed to load templates");
      const data = await res.json();
      if (data.success) {
        // Merge system + server templates (deduplicate by id)
        const systemIds = new Set(ALL_SYSTEM_TEMPLATES.map((t) => t.id));
        const serverOnly = (data.templates ?? []).filter((t: Template) => !systemIds.has(t.id));
        setTemplates([...ALL_SYSTEM_TEMPLATES, ...serverOnly]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data-fetching: setState in loadTemplates()
    loadTemplates();
  }, [loadTemplates]);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          type: newType,
          description: newDesc.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create template");
      setNewName("");
      setNewDesc("");
      setCreating(false);
      loadTemplates();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Помилка");
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string, isSystem: boolean) => {
    if (isSystem) {
      alert("Неможливо видалити системний шаблон");
      return;
    }
    if (!confirm(`Видалити шаблон "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/templates/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete template");
      loadTemplates();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Помилка");
    }
  };

  const filtered = typeFilter ? templates.filter((t) => t.type === typeFilter) : templates;

  return (
    <>
      <div className="page-topbar">
        <h1 className="topbar-title">
          <Icon name="layers" size={20} />
          Шаблони
        </h1>
      </div>

      <div style={{ padding: "var(--sp-5)", maxWidth: 1200, margin: "0 auto" }}>
        {/* Фільтри та створення */}
        <div
          style={{
            display: "flex",
            gap: "var(--sp-2)",
            marginBottom: "var(--sp-4)",
            alignItems: "center",
          }}
        >
          {(["", "site", "page"] as TypeFilter[]).map((t) => (
            <button
              key={t || "all"}
              className={`wb-btn wb-btn-sm ${typeFilter === t ? "wb-btn-primary" : "wb-btn-ghost"}`}
              onClick={() => setTypeFilter(t)}
            >
              {t === "site" ? "Сайти" : t === "page" ? "Сторінки" : "Всі"}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <button
            className="wb-btn wb-btn-sm wb-btn-primary"
            onClick={() => {
              setCreating(!creating);
              setNewName("");
              setNewDesc("");
            }}
          >
            <Icon name="plus" size={14} />
            Створити шаблон
          </button>
        </div>

        {/* Форма створення */}
        {creating && (
          <div className="wb-card" style={{ marginBottom: "var(--sp-4)" }}>
            <div className="wb-card-header">
              <h3 className="wb-card-title">Новий шаблон</h3>
            </div>
            <div
              className="wb-card-body"
              style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}
            >
              <div>
                <label className="wb-label">Назва</label>
                <input
                  className="wb-input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Назва шаблону"
                  autoFocus
                />
              </div>
              <div>
                <label className="wb-label">Тип</label>
                <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                  <button
                    className={`wb-btn wb-btn-sm ${newType === "page" ? "wb-btn-primary" : "wb-btn-ghost"}`}
                    onClick={() => setNewType("page")}
                  >
                    Сторінка
                  </button>
                  <button
                    className={`wb-btn wb-btn-sm ${newType === "site" ? "wb-btn-primary" : "wb-btn-ghost"}`}
                    onClick={() => setNewType("site")}
                  >
                    Сайт
                  </button>
                </div>
              </div>
              <div>
                <label className="wb-label">Опис (необов'язково)</label>
                <textarea
                  className="wb-textarea"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Короткий опис шаблону"
                  rows={2}
                />
              </div>
              <div style={{ display: "flex", gap: "var(--sp-2)" }}>
                <button
                  className="wb-btn wb-btn-primary"
                  onClick={handleCreate}
                  disabled={creating || !newName.trim()}
                >
                  <Icon name="check" size={14} />
                  Створити
                </button>
                <button className="wb-btn wb-btn-ghost" onClick={() => setCreating(false)}>
                  Скасувати
                </button>
              </div>
            </div>
          </div>
        )}

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
            <button className="wb-btn wb-btn-secondary" onClick={loadTemplates}>
              Спробувати знову
            </button>
          </div>
        )}

        {/* Сітка шаблонів */}
        {!loading && !error && (
          <div className="wb-cards-grid">
            {filtered.map((tpl) => (
              <div key={tpl.id} className="wb-card">
                {tpl.thumbnail && (
                  <div
                    style={{
                      height: 120,
                      background: `url(${tpl.thumbnail}) center/cover`,
                      borderRadius: "var(--radius-md) var(--radius-md) 0 0",
                    }}
                  />
                )}
                <div className="wb-card-header">
                  <span className="wb-card-title">{tpl.name}</span>
                  <div style={{ display: "flex", gap: "var(--sp-1)" }}>
                    <span
                      className={`wb-badge ${tpl.type === "site" ? "wb-badge-green" : "wb-badge-neutral"}`}
                    >
                      {tpl.type === "site" ? "Сайт" : "Сторінка"}
                    </span>
                    {tpl.isSystem && <span className="wb-badge wb-badge-yellow">System</span>}
                  </div>
                </div>
                <div className="wb-card-body">
                  <p className="wb-text-sm wb-text-muted">{tpl.description || "Без опису"}</p>
                  {tpl.tags.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "var(--sp-1)",
                        marginTop: "var(--sp-2)",
                        flexWrap: "wrap",
                      }}
                    >
                      {tpl.tags.map((tag) => (
                        <span key={tag} className="wb-badge wb-badge-neutral wb-text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  className="wb-card-footer"
                  style={{ display: "flex", justifyContent: "flex-end" }}
                >
                  {!tpl.isSystem && (
                    <button
                      className="wb-btn wb-btn-sm wb-btn-danger"
                      onClick={() => handleDelete(tpl.id, tpl.name, tpl.isSystem)}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="wb-empty" style={{ gridColumn: "1 / -1" }}>
                <Icon name="layers" size={48} />
                <p className="wb-text-muted">Немає шаблонів</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
