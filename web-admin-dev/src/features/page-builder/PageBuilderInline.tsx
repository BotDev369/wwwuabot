/**
 * PageBuilderInline — вбудований конструктор сторінок для картки сценарію.
 *
 * На відміну від PageBuilderPage, не завантажує/зберігає самостійно —
 * працює з зовнішнім станом (config + onChange).
 *
 * Коли сторінка порожня (жодного блоку в жодній зоні) — показує
 * фокусований empty state з двома кнопками:
 *   - «Додати зону» → модалка вибору зони (header, sidebar, main, footer)
 *   - «Додати блок» → модалка вибору шаблонного типу блоку
 *
 * Визначення "порожності": жодна зона не має блоків.
 * Додавання блоку → блок потрапляє в main, з'являються zone editors.
 * Додавання зони → зона стає видимою (навіть якщо порожня).
 */

import { useMemo, useCallback, useState, useEffect } from "react";
import type {
  PageConfig,
  PageBlock,
  BlockZone,
  BlockContext,
} from "@wwwuabot/shared/types/page-config";
import { ALL_ZONES } from "@wwwuabot/shared/types/page-config";
import { generateBlockId } from "@wwwuabot/shared/types/page-config";
import {
  BLOCK_DEFINITIONS,
  getDefaultProps,
} from "@wwwuabot/shared/constants/block-definitions";
import { icons, type IconName } from "@wwwuabot/shared";
import { ZoneEditor } from "./ZoneEditor";

// ─── Helpers ────────────────────────────────────────────────────────

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

const ZONE_ICONS: Record<BlockZone, IconName> = {
  header: "layout",
  sidebar: "layout",
  main: "layout",
  footer: "layout",
};

/**
 * Визначити, чи сторінка порожня — жодна зона не має блоків.
 */
function isPageEmpty(config: PageConfig): boolean {
  for (const zone of ALL_ZONES) {
    if (config.zones[zone] && config.zones[zone].length > 0) return false;
  }
  return true;
}

/**
 * Отримати список зон, які користувач вже додав (є видимими).
 * Для нових сторінок без `visibleZones` — вважаємо, що main активна.
 */
function getActiveZones(config: PageConfig): BlockZone[] {
  // Якщо є явний список visibleZones — використовуємо його
  if (Array.isArray(config.visibleZones) && config.visibleZones.length > 0) {
    return config.visibleZones.filter((z): z is BlockZone => ALL_ZONES.includes(z as BlockZone));
  }
  // Fallback: main завжди активна
  return ["main"];
}

// ─── Props ──────────────────────────────────────────────────────────

interface Props {
  config: PageConfig;
  onChange: (config: PageConfig) => void;
  codeword: string;
  title?: string | null;
  photoUrl?: string | null;
}

// ─── Main Component ─────────────────────────────────────────────────

export function PageBuilderInline({
  config,
  onChange,
  codeword,
  title,
  photoUrl,
}: Props) {
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

  const context: BlockContext = useMemo(
    () => ({
      codeword,
      title: title ?? null,
      photoUrl: photoUrl ?? null,
    }),
    [codeword, title, photoUrl],
  );

  const empty = useMemo(() => isPageEmpty(config), [config]);
  const activeZones = useMemo(() => getActiveZones(config), [config]);

  // Зони, які ще не додані (для модалки)
  const handleUpdateZoneBlocks = useCallback(
    (zone: BlockZone, blocks: PageBlock[]) => {
      onChange({
        ...config,
        zones: { ...config.zones, [zone]: blocks },
      });
    },
    [config, onChange],
  );

  // ── Додати зону ──
  const handleAddZone = useCallback(
    (zone: BlockZone) => {
      const currentVisible = getActiveZones(config);
      if (currentVisible.includes(zone)) {
        setShowZoneModal(false);
        return;
      }
      // Додаємо зону до visibleZones
      onChange({
        ...config,
        visibleZones: [...currentVisible, zone],
      });
      setShowZoneModal(false);
    },
    [config, onChange],
  );

  // ── Додати блок ──
  const handleAddBlock = useCallback(
    (type: string) => {
      const targetZone: BlockZone = "main";

      const newBlock: PageBlock = {
        id: generateBlockId(),
        type,
        order: (config.zones[targetZone]?.length ?? 0),
        props: getDefaultProps(type),
      };

      // Також додаємо main до visibleZones якщо її там немає
      const currentVisible = getActiveZones(config);
      const updatedVisible = currentVisible.includes(targetZone)
        ? currentVisible
        : [...currentVisible, targetZone];

      onChange({
        ...config,
        visibleZones: updatedVisible,
        zones: {
          ...config.zones,
          [targetZone]: [...(config.zones[targetZone] ?? []), newBlock],
        },
      });

      setShowBlockModal(false);
    },
    [config, onChange],
  );

  return (
    <div>
      {/* Empty state — prominent CTA */}
      {empty && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 24px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "var(--bg-secondary, #f1f5f9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            {ico("construction", 32)}
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: 18,
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: 8,
            }}
          >
            Сторінка порожня
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 14,
              color: "var(--text-secondary)",
              marginBottom: 24,
              maxWidth: 360,
            }}
          >
            Додайте зону або блок, щоб почати конструювання сторінки
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              className="wb-btn wb-btn-secondary"
              onClick={() => setShowZoneModal(true)}
              style={{ fontSize: 14, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8 }}
            >
              {ico("layout", 18)} Додати зону
            </button>
            <button
              className="wb-btn wb-btn-primary"
              onClick={() => setShowBlockModal(true)}
              style={{ fontSize: 14, padding: "10px 20px", display: "flex", alignItems: "center", gap: 8 }}
            >
              {ico("blocks", 18)} Додати блок
            </button>
          </div>
        </div>
      )}

      {/* Zone editors — visible zones + empty active zones */}
      {!empty &&
        activeZones.map((zone) => (
          <ZoneEditor
            key={zone}
            zone={zone}
            blocks={config.zones[zone]}
            context={context}
            onUpdateBlocks={handleUpdateZoneBlocks}
          />
        ))}

      {/* Show active zones even when empty (after user added a zone) */}
      {empty &&
        activeZones.map((zone) => (
          <div
            key={zone}
            style={{
              border: "1px dashed var(--border)",
              borderRadius: 8,
              marginBottom: 12,
              padding: "16px 12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
              {ZONE_LABELS[zone]}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>
              Зона додана, але порожня
            </div>
            <button
              className="wb-btn wb-btn-secondary"
              onClick={() => setShowBlockModal(true)}
              style={{ fontSize: 12 }}
            >
              + Додати блок
            </button>
          </div>
        ))}

      {/* ── Add Zone Modal ── */}
      {showZoneModal && (
        <div
          className="wb-modal-overlay"
          onClick={() => setShowZoneModal(false)}
          style={{ zIndex: 1000 }}
        >
          <div
            className="wb-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 400, width: "100%" }}
          >
            <div className="wb-modal-header">
              <span className="wb-modal-title">
                {ico("layout")} Додати зону
              </span>
              <button
                className="wb-close-btn"
                onClick={() => setShowZoneModal(false)}
              >
                {icons["close"]}
              </button>
            </div>
            <div className="wb-modal-body">
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
                Оберіть зону для додавання на сторінку:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {ALL_ZONES.map((zone) => {
                  const isActive = activeZones.includes(zone);
                  return (
                    <button
                      key={zone}
                      className="wb-btn"
                      onClick={() => handleAddZone(zone)}
                      disabled={isActive}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "12px 16px",
                        textAlign: "left",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        background: isActive ? "var(--bg-secondary)" : "var(--bg-primary)",
                        cursor: isActive ? "default" : "pointer",
                        opacity: isActive ? 0.5 : 1,
                      }}
                    >
                      {ico(ZONE_ICONS[zone], 20)}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{ZONE_LABELS[zone]}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {isActive ? "Вже додана" : "Натисніть щоб додати"}
                        </div>
                      </div>
                      {isActive && ico("check", 16)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="wb-modal-footer">
              <button
                className="wb-btn wb-btn-secondary"
                onClick={() => setShowZoneModal(false)}
              >
                Закрити
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Block Modal ── */}
      {showBlockModal && (
        <AddBlockModal
          onSelect={handleAddBlock}
          onClose={() => setShowBlockModal(false)}
        />
      )}
    </div>
  );
}

// ─── Add Block Modal ────────────────────────────────────────────────

interface AddBlockModalProps {
  onSelect: (type: string) => void;
  onClose: () => void;
}

function AddBlockModal({ onSelect, onClose }: AddBlockModalProps) {
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Collect categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    BLOCK_DEFINITIONS.forEach((d) => cats.add(d.category));
    return Array.from(cats);
  }, []);

  const filtered = useMemo(() => {
    let list = BLOCK_DEFINITIONS;
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
  }, [query, selectedCategory]);

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
            {ico("blocks")} Додати блок
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
            display: "flex",
            gap: 6,
            padding: "8px 16px",
            borderBottom: "1px solid var(--border)",
            overflowX: "auto",
            flexShrink: 0,
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
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
              {filtered.map((def) => (
                <button
                  key={def.type}
                  onClick={() => onSelect(def.type)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 4,
                    padding: "12px 14px",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    background: "var(--bg-primary)",
                    cursor: "pointer",
                    textAlign: "left",
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
