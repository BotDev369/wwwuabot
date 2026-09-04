/**
 * ZoneAddModal — модалка вибору зони для додавання на сторінку.
 */

import { useEffect } from "react";
import { ALL_ZONES, type BlockZone } from "@wwwuabot/shared/types/page-config";
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

const ZONE_ICONS: Record<BlockZone, IconName> = {
  header: "layout",
  sidebar: "layout",
  main: "layout",
  footer: "layout",
};

// ── Props ─────────────────────────────────────────────────────────

interface ZoneAddModalProps {
  activeZones: BlockZone[];
  onSelect: (zone: BlockZone) => void;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────

export function ZoneAddModal({ activeZones, onSelect, onClose }: ZoneAddModalProps) {
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
        style={{ maxWidth: 400, width: "100%" }}
      >
        <div className="wb-modal-header">
          <span className="wb-modal-title">
            {ico("layout")} Додати зону
          </span>
          <button className="wb-close-btn" onClick={onClose}>
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
                  onClick={() => onSelect(zone)}
                  disabled={isActive}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
                    textAlign: "left", border: "1px solid var(--border)", borderRadius: 8,
                    background: isActive ? "var(--bg-secondary)" : "var(--bg-primary)",
                    cursor: isActive ? "default" : "pointer", opacity: isActive ? 0.5 : 1,
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
          <button className="wb-btn wb-btn-secondary" onClick={onClose}>
            Закрити
          </button>
        </div>
      </div>
    </div>
  );
}
