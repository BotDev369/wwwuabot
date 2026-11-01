/**
 * SidebarSettings — налаштування зони сайдбару.
 *
 * Лишається тільки те, що справді впливає на вигляд: бік кнопки закриття.
 * Кегль і відступ пунктів меню більше не налаштовуються — меню бічної панелі
 * має одну міру (правило 14 `docs/DESIGN_SYSTEM.md`).
 */

import type { SidebarSettings as SidebarSettingsType } from "@wwwuabot/shared/types/page-config";
import { icons } from "@wwwuabot/shared";

interface SidebarSettingsProps {
  settings?: SidebarSettingsType;
  onUpdate: (settings: SidebarSettingsType) => void;
}

export function SidebarSettingsPanel({ settings, onUpdate }: SidebarSettingsProps) {
  return (
    <div className="pb-sidebar-settings">
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-primary)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            width: 14,
            height: 14,
            flexShrink: 0,
            color: "var(--text-secondary)",
          }}
        >
          {icons["home"]}
        </span>
        <span>Налаштування сайдбару</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
          Кнопка «закрити»
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            type="button"
            className={`kb-toggle-btn${(settings?.closeButtonPosition ?? "left") === "left" ? " kb-toggle-btn--active" : ""}`}
            onClick={() => onUpdate({ ...settings, closeButtonPosition: "left" })}
            style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}
          >
            Зліва
          </button>
          <button
            type="button"
            className={`kb-toggle-btn${settings?.closeButtonPosition === "right" ? " kb-toggle-btn--active" : ""}`}
            onClick={() => onUpdate({ ...settings, closeButtonPosition: "right" })}
            style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}
          >
            Справа
          </button>
        </div>
      </div>
    </div>
  );
}
