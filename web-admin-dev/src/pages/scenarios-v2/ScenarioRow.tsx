/**
 * ScenarioRow — один рядок таблиці сценаріїв.
 */

import type { IconName } from "@wwwuabot/shared";
import { icons } from "@wwwuabot/shared";
import { relativeTime, getTypeBadge, getTitle, type ScenarioSurface } from "./helpers";

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
    slug: string;
    /** Команда, якою екран відкривається в чаті; у головної — `/start`. */
    bot_command?: string | null;
    rich_message: string | null;
    page_data?: string | null;
    updated_at: string;
    title?: string | null;
  };
  surface: ScenarioSurface;
  isSelected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}

export function ScenarioRow({ scenario, surface, isSelected, onSelect, onOpen }: ScenarioRowProps) {
  const badge = getTypeBadge(scenario);
  const title = getTitle(scenario as Record<string, unknown>);
  // У бота рядок називається командою: головна має порожній `slug` (адреса
  // веб-кореня), і без `bot_command` її рядок виглядав порожнім.
  const address = surface === "bot" ? scenario.bot_command?.trim() || scenario.slug : scenario.slug;
  const hasTitle = title !== address;

  return (
    <tr
      className={`wb-table-row--click${isSelected ? " wb-table-row--on" : ""}`}
      onClick={onSelect}
      aria-current={isSelected ? "true" : undefined}
    >
      <td className="wb-cell-name">
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontWeight: 500 }}>{address}</span>
          {hasTitle && <span className="wb-cell-sub">{title}</span>}
        </div>
      </td>
      <td>
        <span
          className="wb-table-badge"
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
      <td className="wb-cell-nowrap wb-text-muted wb-text-xs" title={scenario.updated_at}>
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
