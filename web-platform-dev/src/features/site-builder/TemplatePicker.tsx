/**
 * TemplatePicker — візуальний вибір шаблону для створення сайту.
 *
 * Показує системні шаблони з превʼю, тегами та описом.
 *
 * @module web-platform-dev/src/features/site-builder/TemplatePicker
 */

import { useState, useEffect } from "react";
import type { Template, TemplateType } from "@wwwuabot/shared";
import { Icon } from "@wwwuabot/shared";

// ── Types ────────────────────────────────────────────────────

interface TemplatePickerProps {
  /** Обраний шаблон (або null). */
  selected: Template | null;
  /** Коли користувач обирає шаблон. */
  onSelect: (template: Template) => void;
  /** Тип шаблонів для показу. */
  typeFilter?: TemplateType;
}

// ── Component ────────────────────────────────────────────────

export function TemplatePicker({
  selected,
  onSelect,
  typeFilter,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState<TemplateType | "all">(
    typeFilter ?? "all",
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/templates");
        if (!res.ok) throw new Error("Failed to load templates");
        const data = await res.json();
        if (!cancelled) {
          setTemplates(data.templates ?? []);
        }
      } catch {
        //静默 — покажемо порожній стан
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = templates.filter(
    (t) => activeType === "all" || t.type === activeType,
  );

  return (
    <div className="template-picker">
      {/* Заголовок */}
      <h3 style={{ margin: 0, marginBottom: "var(--sp-3)", fontSize: "var(--text-md)" }}>
        Оберіть шаблон
      </h3>

      {/* Фільтр типів */}
      {typeFilter === undefined && (
        <div style={{ display: "flex", gap: "var(--sp-2)", marginBottom: "var(--sp-4)" }}>
          {(["all", "site", "page"] as const).map((t) => (
            <button
              key={t}
              className={`wb-btn wb-btn-sm ${
                activeType === t ? "wb-btn-primary" : "wb-btn-ghost"
              }`}
              onClick={() => setActiveType(t)}
            >
              {t === "all" ? "Всі" : t === "site" ? "Сайти" : "Сторінки"}
            </button>
          ))}
        </div>
      )}

      {/* Завантаження */}
      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "var(--sp-3)" }}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="wb-card"
              style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <div className="wb-skeleton" style={{ width: 80, height: 20 }} />
            </div>
          ))}
        </div>
      )}

      {/* Сітка шаблонів */}
      {!loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "var(--sp-3)",
          }}
        >
          {/* Blank template option */}
          <TemplateCard
            template={null}
            isSelected={!selected}
            onClick={() => onSelect(null as unknown as Template)}
          />

          {filtered.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              isSelected={selected?.id === tpl.id}
              onClick={() => onSelect(tpl)}
            />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="wb-empty" style={{ padding: "var(--sp-5)" }}>
          <Icon name="layers" size={32} />
          <p className="wb-text-muted">Шаблонів не знайдено</p>
        </div>
      )}
    </div>
  );
}

// ── Template Card ────────────────────────────────────────────

function TemplateCard({
  template,
  isSelected,
  onClick,
}: {
  template: Template | null;
  isSelected: boolean;
  onClick: () => void;
}) {
  const isBlank = template === null;

  return (
    <div
      className="wb-card"
      style={{
        cursor: "pointer",
        borderColor: isSelected ? "var(--accent)" : undefined,
        borderWidth: isSelected ? 2 : 1,
        transition: "border-color 0.15s ease",
        overflow: "hidden",
      }}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div
        style={{
          height: 120,
          background: isBlank
            ? "var(--bg-2)"
            : template.thumbnail
              ? `url(${template.thumbnail}) center/cover`
              : "var(--bg-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isBlank && (
          <div style={{ textAlign: "center" }}>
            <Icon name="plus" size={32} />
            <p className="wb-text-xs wb-text-muted" style={{ marginTop: "var(--sp-1)" }}>
              З нуля
            </p>
          </div>
        )}
        {!isBlank && !template.thumbnail && (
          <div style={{ textAlign: "center" }}>
            <Icon name={template.type === "site" ? "layout" : "layers"} size={32} />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="wb-card-body" style={{ padding: "var(--sp-3)" }}>
        <div className="wb-flex-between">
          <span className="wb-text-sm" style={{ fontWeight: 600 }}>
            {isBlank ? "З нуля" : template.name}
          </span>
          {!isBlank && (
            <span className={`wb-badge ${template.type === "site" ? "wb-badge-green" : "wb-badge-neutral"}`}>
              {template.type === "site" ? "Сайт" : "Сторінка"}
            </span>
          )}
        </div>

        {!isBlank && template.description && (
          <p className="wb-text-xs wb-text-muted" style={{ marginTop: "var(--sp-1)" }}>
            {template.description}
          </p>
        )}

        {!isBlank && template.tags.length > 0 && (
          <div style={{ display: "flex", gap: "var(--sp-1)", marginTop: "var(--sp-2)", flexWrap: "wrap" }}>
            {template.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="wb-badge wb-badge-neutral wb-text-xs">
                {tag}
              </span>
            ))}
          </div>
        )}

        {!isBlank && template.isSystem && (
          <p className="wb-text-xs wb-text-muted" style={{ marginTop: "var(--sp-1)" }}>
            Вбудований
          </p>
        )}
      </div>
    </div>
  );
}
