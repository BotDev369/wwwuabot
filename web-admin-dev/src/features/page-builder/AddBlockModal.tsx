/**
 * AddBlockModal — модалка вибору типу блоку для додавання.
 *
 * Підтримує пошук, фільтрацію за категоріями, сумісність із зонами.
 */

import { useMemo, useState, useEffect } from "react";
import type { BlockZone } from "@wwwuabot/shared/types/page-config";
import { BLOCK_DEFINITIONS } from "@wwwuabot/shared/constants/block-definitions";
import { icons, type IconName } from "@wwwuabot/shared";

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: IconName, size = 16) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

const ZONE_LABELS: Record<BlockZone, string> = {
  header: "Header",
  sidebar: "Sidebar",
  main: "Main",
  footer: "Footer",
};

// ── Props ─────────────────────────────────────────────────────────

interface AddBlockModalProps {
  onSelect: (type: string) => void;
  onClose: () => void;
  targetZone?: BlockZone | null;
}

// ── Component ─────────────────────────────────────────────────────

export function AddBlockModal({ onSelect, onClose, targetZone }: AddBlockModalProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    const zoneBlocks = targetZone
      ? BLOCK_DEFINITIONS.filter(
          (d) => d.compatibleZones.length === 0 || d.compatibleZones.includes(targetZone),
        )
      : BLOCK_DEFINITIONS;
    zoneBlocks.forEach((d) => cats.add(d.category));
    return Array.from(cats);
  }, [targetZone]);

  const filtered = useMemo(() => {
    let list = targetZone
      ? BLOCK_DEFINITIONS.filter(
          (d) => d.compatibleZones.length === 0 || d.compatibleZones.includes(targetZone),
        )
      : BLOCK_DEFINITIONS;
    if (selectedCategory) {
      list = list.filter((d) => d.category === selectedCategory);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.label.toLowerCase().includes(q) ||
          (d.description ?? "").toLowerCase().includes(q) ||
          d.type.toLowerCase().includes(q),
      );
    }
    return list;
  }, [query, selectedCategory, targetZone]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="wb-modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div
        className="wb-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column" }}
      >
        <div className="wb-modal-header">
          <span className="wb-modal-title">
            {ico("blocks")} Додати блок{targetZone ? ` → ${ZONE_LABELS[targetZone]}` : ""}
          </span>
          <button className="wb-close-btn" onClick={onClose}>
            {icons["close"]}
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "8px 16px", borderBottom: "1px solid var(--border)" }}>
          <input
            type="text"
            className="wb-input"
            placeholder="Пошук блоку…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            style={{ width: "100%", fontSize: 13 }}
          />
        </div>

        {/* Category pills */}
        <div
          style={{
            display: "flex", gap: 6, padding: "8px 16px",
            borderBottom: "1px solid var(--border)", overflowX: "auto", flexShrink: 0,
          }}
        >
          <button
            className={`kb-toggle-btn${selectedCategory === null ? " kb-toggle-btn--active" : ""}`}
            onClick={() => setSelectedCategory(null)}
            style={{ fontSize: 12, whiteSpace: "nowrap" }}
          >
            Усі
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`kb-toggle-btn${selectedCategory === cat ? " kb-toggle-btn--active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
              style={{ fontSize: 12, whiteSpace: "nowrap", textTransform: "capitalize" }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Block list */}
        <div className="wb-modal-body" style={{ flex: 1, overflow: "auto", padding: "8px 16px" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 24, color: "var(--text-secondary)", fontSize: 13 }}>
              Нічого не знайдено
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
              {filtered.map((def) => (
                <button
                  key={def.type}
                  onClick={() => onSelect(def.type)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
                    padding: "12px 14px", border: "1px solid var(--border)", borderRadius: 8,
                    background: "var(--bg-primary)", cursor: "pointer", textAlign: "left",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--accent, #6366f1)";
                    e.currentTarget.style.background = "var(--bg-secondary, #f1f5f9)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--bg-primary)";
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {def.icon ? ico(def.icon as IconName, 16) : ico("blocks", 16)}
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{def.label}</span>
                  </div>
                  {def.description && (
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.3 }}>
                      {def.description}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="wb-modal-footer">
          <button className="wb-btn wb-btn-secondary" onClick={onClose}>
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
}
