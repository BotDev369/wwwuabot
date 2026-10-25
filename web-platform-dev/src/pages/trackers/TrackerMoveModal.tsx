/**
 * «Перемістити» — дерево груп із кнопкою «Обрати» в кожному рядку: місце
 * призначення обирають точно, а не вгадують стрілками «вище/нижче». Гілка,
 * яку переміщують (разом із нащадками), у дереві не показується — група не
 * може стати під собою; теперішнє місце каже «Тут» замість «Обрати».
 *
 * @module web-platform-dev/src/pages/trackers/TrackerMoveModal
 */

import { useMemo, useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuModal } from "@wwwuabot/ui/menu";
import {
  TRACKER_OWN_GROUP_KEY,
  buildTrackerGroupTree,
  type TrackerGroup,
  type TrackerGroupNode,
} from "@wwwuabot/shared/trackers";

/** id гілок — тільки їх розгортає «розгорнути всі»; листя й так завжди видно. */
function branchIds(nodes: readonly TrackerGroupNode[], into: number[] = []): number[] {
  for (const node of nodes) {
    if (node.children.length > 0) into.push(node.group.id);
    branchIds(node.children, into);
  }
  return into;
}

interface TrackerMoveModalProps {
  /** Що переміщують — назва в заголовку поверхні. */
  name: string;
  groups: readonly TrackerGroup[];
  /** Теперішнє місце: `null` — верхній рівень (у трекера — «Свої»). */
  currentId: number | null;
  /** Рядок-корінь: «Верхній рівень» для групи, «Свої» для трекера. */
  rootLabel: string;
  /** Гілка, якої в дереві немає: сама група й усі нащадки. */
  excludeIds?: readonly number[];
  onPick: (groupId: number | null) => void;
  onClose: () => void;
}

export function TrackerMoveModal({
  name,
  groups,
  currentId,
  rootLabel,
  excludeIds,
  onPick,
  onClose,
}: TrackerMoveModalProps): ReactElement {
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());

  // «Свої» — не місце для групи: це кошик мірок без групи, і в дереві він
  // займав би рядок, що нічого не значить. Рух на верхній рівень каже корінь.
  const tree = useMemo(() => {
    const hidden = new Set(excludeIds ?? []);
    return buildTrackerGroupTree(
      groups.filter((group) => !hidden.has(group.id) && group.key !== TRACKER_OWN_GROUP_KEY),
    );
  }, [groups, excludeIds]);
  const branches = useMemo(() => branchIds(tree), [tree]);
  const allOpen = branches.length > 0 && branches.every((id) => expanded.has(id));

  function toggle(id: number): void {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function row(
    key: number | "root",
    depth: number,
    title: string,
    options: {
      branch?: boolean;
      open?: boolean;
      onToggle?: () => void;
      onPick: () => void;
      here: boolean;
    },
  ): ReactElement {
    return (
      <li key={key} className="wb-group-picker-row" style={{ marginInlineStart: depth * 14 }}>
        {options.branch ? (
          <button
            type="button"
            className="wb-group-picker-toggle"
            aria-expanded={options.open}
            aria-label={`${options.open ? "Згорнути" : "Розгорнути"} ${title}`}
            onClick={options.onToggle}
          >
            <Icon name={options.open ? "chevron-down" : "chevron-right"} size={16} />
          </button>
        ) : (
          <span className="wb-group-picker-toggle" aria-hidden="true" />
        )}
        <span className="wb-group-picker-lead">
          <Icon name="folder" size={16} />
          <span className="wb-group-picker-item-text">{title}</span>
        </span>
        <button
          type="button"
          className="wb-btn wb-btn-secondary wb-group-picker-pick"
          disabled={options.here}
          aria-label={`${options.here ? "Теперішнє місце" : "Обрати"}: ${title}`}
          onClick={options.onPick}
        >
          {options.here ? "Тут" : "Обрати"}
        </button>
      </li>
    );
  }

  function rows(nodes: readonly TrackerGroupNode[], depth: number): ReactElement[] {
    return nodes.flatMap((node) => {
      const open = expanded.has(node.group.id);
      const element = row(node.group.id, depth, node.group.title, {
        branch: node.children.length > 0,
        open,
        onToggle: () => toggle(node.group.id),
        onPick: () => onPick(node.group.id),
        here: currentId === node.group.id,
      });
      return open ? [element, ...rows(node.children, depth + 1)] : [element];
    });
  }

  return (
    <MenuModal
      title={`Перемістити «${name}»`}
      onClose={onClose}
      header={
        <div className="wb-group-picker-tools">
          <button
            type="button"
            className="wb-btn wb-btn-secondary"
            disabled={branches.length === 0}
            onClick={() => setExpanded(allOpen ? new Set() : new Set(branches))}
          >
            {allOpen ? "Згорнути всі" : "Розгорнути всі"}
          </button>
        </div>
      }
      content={
        <ul className="wb-group-picker-list">
          {row("root", 0, rootLabel, { onPick: () => onPick(null), here: currentId === null })}
          {rows(tree, 0)}
        </ul>
      }
    />
  );
}
