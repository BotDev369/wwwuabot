/**
 * BlockEditorHeader — заголовок акордеона блоку (компактний рядок).
 */

import type { IconName } from "@wwwuabot/shared";
import { icons } from "@wwwuabot/shared";

const ico = (name: IconName, size = 14) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

interface BlockEditorHeaderProps {
  collapsed: boolean;
  displayName: string;
  blockType: string;
  definitionLabel?: string;
  definitionIcon?: string;
  hasConditions: boolean;
  showConditions: boolean;
  childrenCount: number;
  editingName: boolean;
  nameDraft: string;
  onToggle: () => void;
  onToggleConditions: () => void;
  onRemove: () => void;
  onStartEditName: () => void;
  onNameDraftChange: (value: string) => void;
  onCommitName: () => void;
  onCancelEditName: () => void;
}

export function BlockEditorHeader({
  collapsed, displayName, blockType, definitionLabel, definitionIcon,
  hasConditions, showConditions, childrenCount,
  editingName, nameDraft,
  onToggle, onToggleConditions, onRemove, onStartEditName,
  onNameDraftChange, onCommitName, onCancelEditName,
}: BlockEditorHeaderProps) {
  return (
    <div
      className="pb-be-header"
      style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: collapsed ? "var(--bg-3)" : "var(--bg-4)", cursor: "pointer", userSelect: "none", minHeight: 36 }}
      onClick={onToggle}
    >
      <span style={{ fontSize: 12, color: "var(--text-secondary)", transition: "transform 0.15s ease", transform: collapsed ? "rotate(0deg)" : "rotate(90deg)", flexShrink: 0, width: 12, textAlign: "center" }}>▸</span>

      {definitionIcon && (
        <span style={{ flexShrink: 0, color: "var(--text-secondary)", display: "inline-flex", alignItems: "center" }}>
          {ico(definitionIcon as IconName, 14)}
        </span>
      )}

      {editingName ? (
        <input type="text" value={nameDraft}
          onChange={(e) => onNameDraftChange(e.target.value)}
          onBlur={onCommitName}
          onKeyDown={(e) => { if (e.key === "Enter") onCommitName(); if (e.key === "Escape") onCancelEditName(); }}
          autoFocus onClick={(e) => e.stopPropagation()}
          style={{ flex: "1 1 0", minWidth: 0, fontSize: 13, fontWeight: 600, padding: "1px 6px", border: "1px solid var(--accent)", borderRadius: 4, background: "var(--bg-1)", color: "var(--text-primary)", outline: "none" }}
        />
      ) : (
        <span style={{ flex: "1 1 0", minWidth: 0, fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
          title="Натисніть щоб змінити назву"
          onClick={(e) => { e.stopPropagation(); onStartEditName(); }}
        >{displayName}</span>
      )}

      <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "var(--bg-4)", color: "var(--text-secondary)", fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 }}>
        {definitionLabel ?? blockType}
      </span>

      {hasConditions && (
        <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, background: "var(--accent)", color: "#fff", fontWeight: 600, flexShrink: 0 }}>COND</span>
      )}

      {childrenCount > 0 && (
        <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 4, background: "var(--bg-4)", color: "var(--text-secondary)", flexShrink: 0 }}>{childrenCount}</span>
      )}

      <div className="pb-be-actions" style={{ display: "flex", gap: 2, flexShrink: 0, marginLeft: 2 }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onToggleConditions} className="pb-be-cond-btn"
          style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: `1px solid ${showConditions ? "var(--accent)" : "var(--border)"}`, background: showConditions ? "var(--accent)" : "transparent", color: showConditions ? "#fff" : "var(--text-secondary)", cursor: "pointer", whiteSpace: "nowrap", lineHeight: "16px" }}
          title="Умови показу"
        >{ico("eye", 11)}</button>
        <button className="pb-be-del-btn" onClick={onRemove}
          style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", whiteSpace: "nowrap", lineHeight: "16px", display: "inline-flex", alignItems: "center" }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--red)"; e.currentTarget.style.color = "var(--red)"; e.currentTarget.style.background = "var(--red-dim)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "transparent"; }}
          title="Видалити блок"
        >{ico("trash", 11)}</button>
      </div>
    </div>
  );
}
