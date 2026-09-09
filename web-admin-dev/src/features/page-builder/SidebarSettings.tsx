/**
 * SidebarSettings — налаштування зони сайдбару (кнопка закриття, розмір тексту, відступи).
 */

import type { SidebarSettings as SidebarSettingsType } from "@wwwuabot/shared/types/page-config";
import { icons } from "@wwwuabot/shared";

interface SidebarSettingsProps {
  settings?: SidebarSettingsType;
  onUpdate: (settings: SidebarSettingsType) => void;
}

export function SidebarSettingsPanel({ settings, onUpdate }: SidebarSettingsProps) {
  return (
    <div
      className="pb-sidebar-settings"
      style={{
        padding: "10px 14px", background: "var(--bg-2)", border: "1px solid var(--border)",
        borderRadius: 8, marginBottom: 12, display: "flex", flexDirection: "column", gap: 10,
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, color: "var(--text-primary)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", width: 14, height: 14, flexShrink: 0, color: "var(--text-secondary)" }}>{icons["home"]}</span>
        <span>Налаштування сайдбару</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
        {/* Close button position */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Кнопка "закрити"</label>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className={`kb-toggle-btn${(settings?.closeButtonPosition ?? "left") === "left" ? " kb-toggle-btn--active" : ""}`}
              onClick={() => onUpdate({ ...settings, closeButtonPosition: "left" })}
              style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}
            >Зліва</button>
            <button
              type="button"
              className={`kb-toggle-btn${settings?.closeButtonPosition === "right" ? " kb-toggle-btn--active" : ""}`}
              onClick={() => onUpdate({ ...settings, closeButtonPosition: "right" })}
              style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}
            >Справа</button>
          </div>
        </div>

        {/* Font size */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Розмір тексту (пункти меню)</label>
          <select
            className="wb-input"
            value={settings?.fontSize ?? "sm"}
            onChange={(e) => onUpdate({ ...settings, fontSize: e.target.value })}
            style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-1)", color: "var(--text-primary)" }}
          >
            <option value="xs">12px (XS — Дрібний)</option>
            <option value="sm">14px (S — Звичайний)</option>
            <option value="base">16px (M — Середній)</option>
            <option value="lg">18px (L — Великий)</option>
            <option value="xl">20px (XL — Дуже великий)</option>
          </select>
        </div>

        {/* Item spacing */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>Відступи між пунктами</label>
          <select
            className="wb-input"
            value={settings?.itemSpacing ?? "sm"}
            onChange={(e) => onUpdate({ ...settings, itemSpacing: e.target.value })}
            style={{ fontSize: 12, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-1)", color: "var(--text-primary)" }}
          >
            <option value="none">0px (Без відступу)</option>
            <option value="xs">4px (Компактний)</option>
            <option value="sm">8px (Стандартний)</option>
            <option value="md">12px (Середній)</option>
            <option value="lg">16px (Просторий)</option>
            <option value="xl">24px (Широкий)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
