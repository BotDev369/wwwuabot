/**
 * AddBlockModal — модалка вибору типу блоку: пошук, категорії, сумісність із зоною.
 *
 * Підсвічування картки — `:hover` у CSS під `@media (hover: hover)`, а не запис
 * у `style` з `onMouseEnter`: на тачі таке підсвічування залипає.
 */

import { useMemo, useState, useEffect } from "react";
import type { BlockZone } from "@wwwuabot/shared/types/page-config";
import { BLOCK_DEFINITIONS } from "@wwwuabot/shared/constants/block-definitions";
import { icons, type IconName } from "@wwwuabot/shared";

// ── Icon helper ───────────────────────────────────────────────────

const ico = (name: IconName) => <span className="pb-icon">{icons[name]}</span>;

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
    <div className="wb-modal-overlay pb-modal-overlay--top" onClick={onClose}>
      <div className="wb-modal pb-modal-add" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <span className="wb-modal-title">
            {ico("blocks")} Додати блок{targetZone ? ` → ${ZONE_LABELS[targetZone]}` : ""}
          </span>
          <button className="wb-close-btn" onClick={onClose}>
            {icons["close"]}
          </button>
        </div>

        {/* Search */}
        <div className="pb-modal-add__search">
          <input
            type="text"
            className="wb-input pb-modal-add__input"
            placeholder="Пошук блоку…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        {/* Category pills */}
        <div className="pb-modal-add__pills">
          <button
            className={`kb-toggle-btn pb-modal-add__pill${selectedCategory === null ? " kb-toggle-btn--active" : ""}`}
            onClick={() => setSelectedCategory(null)}
          >
            Усі
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`kb-toggle-btn pb-modal-add__pill pb-modal-add__pill--capitalize${selectedCategory === cat ? " kb-toggle-btn--active" : ""}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Block list */}
        <div className="wb-modal-body pb-modal-add__body">
          {filtered.length === 0 ? (
            <div className="pb-modal-add__empty">Нічого не знайдено</div>
          ) : (
            <div className="pb-modal-add__grid">
              {filtered.map((def) => (
                <button
                  key={def.type}
                  onClick={() => onSelect(def.type)}
                  className="pb-modal-add__card"
                >
                  <div className="pb-modal-add__card-head">
                    {def.icon ? ico(def.icon) : ico("blocks")}
                    <span className="pb-modal-add__card-title">{def.label}</span>
                  </div>
                  {def.description && (
                    <span className="pb-modal-add__card-desc">{def.description}</span>
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
