/**
 * Смуга груп і вхід в архів; на телефоні — чипи, що скроляться вбік.
 *
 * @module web-admin-dev/src/pages/desk/DeskGroupRail
 */

import labels from "./desk-labels.json";

interface DeskGroupRailProps {
  counts: Record<string, number>;
  group: string;
  archivedOnly: boolean;
  error: string;
  onPickGroup: (group: string) => void;
  onToggleArchive: () => void;
}

export function DeskGroupRail({
  counts,
  group,
  archivedOnly,
  error,
  onPickGroup,
  onToggleArchive,
}: DeskGroupRailProps) {
  const total = counts.all ?? Object.values(counts).reduce((sum, value) => sum + value, 0);

  return (
    <aside className="desk-groups">
      {labels.groups.map((item) => (
        <button
          key={item.key}
          type="button"
          className={`desk-group${!archivedOnly && item.key === group ? " desk-group--active" : ""}`}
          aria-pressed={!archivedOnly && item.key === group}
          onClick={() => onPickGroup(item.key)}
        >
          <span>{item.label}</span>
          <b>{item.key === "all" ? total : (counts[item.key] ?? 0)}</b>
        </button>
      ))}
      <button
        type="button"
        className={`desk-group${archivedOnly ? " desk-group--active" : ""}`}
        aria-pressed={archivedOnly}
        onClick={onToggleArchive}
      >
        <span>{labels.archive}</span>
      </button>
      {error && <p className="desk-note desk-note--error">{error}</p>}
    </aside>
  );
}
