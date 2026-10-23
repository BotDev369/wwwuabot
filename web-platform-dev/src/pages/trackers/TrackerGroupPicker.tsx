/**
 * Вибір групи: модалка з деревом-провідником — типово все закрито,
 * «розгорнути всі» поруч «ствворити нову», вибір — рядок дерева.
 * Нативний `select` показував плаский список без структури й без
 * створення: підпапки губилися в ім'ях із відступом. `docs/TRACKERS.md`.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerGroupPicker
 */

import { useId, useMemo, useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuModal } from "@wwwuabot/ui/menu";
import { useDialog } from "@wwwuabot/ui/dialog";
import {
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

interface TrackerGroupPickerProps {
  /** Мітка поля — вона ж ім'я кнопки й заголовок модалки для читача екрана. */
  label: string;
  groups: readonly TrackerGroup[];
  /**
   * Обрана група: `undefined` — людина ще не обирала (поле порожнє),
   * `null` — «Свої» (без групи).
   */
  value: number | null | undefined;
  onPick: (groupId: number | null) => void;
  /** Створити нову верхню групу. Немає — і кнопки «Створити нову» немає. */
  onCreate?: (title: string) => Promise<TrackerGroup | null>;
}

export function TrackerGroupPicker({
  label,
  groups,
  value,
  onPick,
  onCreate,
}: TrackerGroupPickerProps): ReactElement {
  const dialog = useDialog();
  const labelId = useId();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(() => new Set());

  const tree = useMemo(() => buildTrackerGroupTree(groups), [groups]);
  const branches = useMemo(() => branchIds(tree), [tree]);
  const allOpen = branches.length > 0 && branches.every((id) => expanded.has(id));
  const selected =
    value === undefined
      ? ""
      : value === null
        ? "Свої"
        : (groups.find((group) => group.id === value)?.title ?? "Свої");

  function show(): void {
    // Провідник відкривається закритим: розкладку дерева людина розгортає сама.
    setExpanded(new Set());
    setOpen(true);
  }

  function pick(groupId: number | null): void {
    onPick(groupId);
    setOpen(false);
  }

  function toggle(id: number): void {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll(): void {
    setExpanded(allOpen ? new Set() : new Set(branches));
  }

  async function create(): Promise<void> {
    if (!onCreate) return;
    const title = await dialog.prompt("Назва нової групи:", {
      validate: (text) => (text.trim() ? null : "Порожньо"),
    });
    if (title === null) return;
    const group = await onCreate(title.trim());
    if (group) pick(group.id);
  }

  function row(
    key: number | "own",
    depth: number,
    title: string,
    options: {
      branch?: boolean;
      open?: boolean;
      onToggle?: () => void;
      onPick: () => void;
      on: boolean;
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
        <button
          type="button"
          className={`wb-group-picker-item${options.on ? " wb-group-picker-item--on" : ""}`}
          aria-pressed={options.on}
          onClick={options.onPick}
        >
          <Icon name="folder" size={16} />
          <span className="wb-group-picker-item-text">{title}</span>
          {options.on && <Icon name="check" size={16} />}
        </button>
      </li>
    );
  }

  function rows(nodes: readonly TrackerGroupNode[], depth: number): ReactElement[] {
    return nodes.flatMap((node) => {
      const open = expanded.has(node.group.id);
      const rowElement = row(node.group.id, depth, node.group.title, {
        branch: node.children.length > 0,
        open,
        onToggle: () => toggle(node.group.id),
        onPick: () => pick(node.group.id),
        on: value === node.group.id,
      });
      return open ? [rowElement, ...rows(node.children, depth + 1)] : [rowElement];
    });
  }

  return (
    <div className="wb-field">
      <span className="wb-label" id={labelId}>
        {label}
      </span>
      <button
        type="button"
        className="wb-select wb-group-picker-trigger"
        aria-haspopup="dialog"
        aria-labelledby={labelId}
        onClick={show}
      >
        <span className={`wb-group-picker-value${selected ? "" : " wb-text-muted"}`}>
          {selected || "Обрати групу"}
        </span>
        <Icon name="chevron-down" size={16} />
      </button>
      {open && (
        <MenuModal
          title={label}
          onClose={() => setOpen(false)}
          header={
            <div className="wb-group-picker-tools">
              {onCreate && (
                <button
                  type="button"
                  className="wb-btn wb-btn-secondary"
                  onClick={() => void create()}
                >
                  Створити нову
                </button>
              )}
              <button
                type="button"
                className="wb-btn wb-btn-secondary"
                disabled={branches.length === 0}
                onClick={toggleAll}
              >
                {allOpen ? "Згорнути всі" : "Розгорнути всі"}
              </button>
            </div>
          }
          content={
            <ul className="wb-group-picker-list">
              {row("own", 0, "Свої", { onPick: () => pick(null), on: value === null })}
              {rows(tree, 0)}
            </ul>
          }
        />
      )}
    </div>
  );
}
