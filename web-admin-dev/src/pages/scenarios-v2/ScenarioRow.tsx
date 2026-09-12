/**
 * ScenarioRow — один рядок таблиці сценаріїв.
 */

import type { IconName } from "@wwwuabot/shared";
import { icons } from "@wwwuabot/shared";
import { relativeTime, getTypeBadge, getTitle } from "./helpers";

const ico = (name: IconName, size = 18) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      width: size,
      height: size,
      flexShrink: 0,
    }}
  >
    {icons[name]}
  </span>
);

interface ScenarioRowProps {
  scenario: {
    codeword: string;
    rich_message: string | null;
    page_data?: string | null;
    updated_at: string;
    title?: string | null;
  };
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

export function ScenarioRow({ scenario, isSelected, onSelect, onOpen }: ScenarioRowProps) {
  const badge = getTypeBadge(scenario);
  const title = getTitle(scenario as Record<string, unknown>);
  const hasTitle = title !== scenario.codeword;

  return (
    <tr
      className={`usr-row${isSelected ? " usr-row--selected" : ""}`}
      onClick={onSelect}
      style={{ cursor: "pointer" }}
    >
      <td className="usr-td-name">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontWeight: 500 }}>{scenario.codeword}</span>
          {hasTitle && (
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 200,
              }}
            >
              {title}
            </span>
          )}
        </div>
      </td>
      <td>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px",
            fontSize: 11,
            fontWeight: 500,
            borderRadius: 10,
            background: badge.color,
            color: "#fff",
          }}
        >
          {ico(badge.icon, 12)} {badge.label}
        </span>
      </td>
      <td className="usr-td-date" title={scenario.updated_at}>
        {relativeTime(scenario.updated_at)}
      </td>
      <td>
        <button
          className="wb-btn wb-btn-secondary"
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          style={{ fontSize: 12, padding: "4px 10px" }}
          title="Відкрити сценарій"
        >
          {ico("link", 14)} Відкрити
        </button>
      </td>
    </tr>
  );
}
