/**
 * GroupSection — група сценаріїв з заголовком та акордеоном.
 */

import { useState } from "react";
import type { IconName } from "@wwwuabot/shared";
import { icons } from "@wwwuabot/shared";
import { ScenarioRow } from "./ScenarioRow";
import type { ScenarioGroupMode } from "../../features/scenarios/store";

const ico = (name: IconName, size = 18) => (
  <span style={{ display: "inline-flex", alignItems: "center", width: size, height: size, flexShrink: 0 }}>
    {icons[name]}
  </span>
);

interface GroupSectionProps {
  groupKey: string;
  groupMode: ScenarioGroupMode;
  items: Array<{ codeword: string; rich_message: string | null; page_data?: string | null; updated_at: string }>;
  selectedRow: string | null;
  onSelect: (codeword: string) => void;
  onOpen: (codeword: string) => void;
}

export function GroupSection({ groupKey, groupMode, items, selectedRow, onSelect, onOpen }: GroupSectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  const label = groupMode === "type"
    ? groupKey === "photo" ? "Photo (класичні)" : groupKey === "rich" ? "Rich (річ-повідомлення)" : "Page (веб-сторінки)"
    : groupKey;

  const icon: IconName = groupMode === "type"
    ? groupKey === "photo" ? "image" : groupKey === "rich" ? "sparkles" : "globe"
    : "clipboard";

  return (
    <>
      <tr onClick={() => setCollapsed(!collapsed)} style={{ cursor: "pointer" }}>
        <td colSpan={4} style={{ padding: "8px 12px", fontWeight: 600, fontSize: 13, background: "var(--bg-secondary, #f1f5f9)", borderBottom: "1px solid var(--border)", userSelect: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>{collapsed ? "▸" : "▾"}</span>
            {ico(icon, 16)}
            <span style={{ textTransform: "capitalize" }}>{label}</span>
            <span style={{ fontSize: 11, color: "var(--text-secondary)", background: "var(--bg-tertiary)", padding: "1px 6px", borderRadius: 10 }}>{items.length}</span>
          </div>
        </td>
      </tr>
      {!collapsed && items.map((s) => (
        <ScenarioRow key={s.codeword} scenario={s} isSelected={selectedRow === s.codeword}
          onSelect={() => onSelect(s.codeword)} onOpen={() => onOpen(s.codeword)}
        />
      ))}
    </>
  );
}
