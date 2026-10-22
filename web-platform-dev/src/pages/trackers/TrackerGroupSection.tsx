/**
 * Група-акордеон: заголовок із рахунком і діями, всередині — підгрупи
 * (рекурсивно) й рядки-матриці; згорнутий стан показує рекурсивний рахунок
 * мірок. Дії групи — меню-модалка на все вікно (AGENTS.md §4): типова
 * тематика каталогу прибрати не можна — сервер чинить опір.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerGroupSection
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuModal, type MenuItem } from "@wwwuabot/ui/menu";
import { useDialog } from "@wwwuabot/ui/dialog";
import type { Tracker, TrackerGroup } from "@wwwuabot/shared/trackers";
import { TrackerMatrixRow } from "./TrackerMatrixRow";
import type { TrackerGroupTreeView } from "./trackers-view";

interface TrackerGroupSectionProps {
  view: TrackerGroupTreeView;
  depth: number;
  cellsOf: (tracker: Tracker) => readonly { day: string; value: number | null; goalMet: boolean }[];
  today: string;
  saving: boolean;
  isOpen: (id: number) => boolean;
  onToggle: (id: number) => void;
  /** Режим «Порядок»: у рядків замість днів — стрілки, межа — сусіди групи. */
  ordering: boolean;
  onMoveTracker: (id: number, direction: "up" | "down") => void;
  onOpenTracker: (id: number) => void;
  onSave: (trackerId: number, value: number, note: string) => Promise<boolean>;
  onCreateGroup: (title: string, parentId: number | null) => Promise<TrackerGroup | null>;
  onUpdateGroup: (
    id: number,
    patch: { title?: string; parentId?: number | null },
  ) => Promise<boolean>;
  onDeleteGroup: (id: number) => Promise<boolean>;
}

export function TrackerGroupSection({
  view,
  depth,
  cellsOf,
  today,
  saving,
  isOpen,
  onToggle,
  ordering,
  onMoveTracker,
  onOpenTracker,
  onSave,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
}: TrackerGroupSectionProps): ReactElement {
  const dialog = useDialog();
  const [menu, setMenu] = useState(false);
  const open = isOpen(view.group.id);
  const titleId = `tracker-group-${view.group.id}`;

  async function rename(): Promise<void> {
    const title = await dialog.prompt("Назва групи:", {
      defaultValue: view.group.title,
      validate: (value) => (value.trim() ? null : "Порожньо"),
    });
    if (title !== null) await onUpdateGroup(view.group.id, { title: title.trim() });
  }

  async function addSubgroup(): Promise<void> {
    const title = await dialog.prompt("Назва підгрупи:", {
      validate: (value) => (value.trim() ? null : "Порожньо"),
    });
    // Згорнутий батько одразу рахує нову підгрупу у своєму числі — це й
    // видно; розгортати за людину не треба, вона сама вирішує, що дивитись.
    if (title !== null) await onCreateGroup(title.trim(), view.group.id);
  }

  async function remove(): Promise<void> {
    const ok = await dialog.confirm(
      `Прибрати «${view.group.title}»? Трекери й підгрупи піднімуться вище.`,
      { tone: "danger", confirmText: "Прибрати" },
    );
    if (ok) await onDeleteGroup(view.group.id);
  }

  const items: MenuItem[] = [
    { key: "sub", label: "Додати підгрупу", icon: "plus", onSelect: () => void addSubgroup() },
    { key: "rename", label: "Перейменувати", icon: "edit", onSelect: () => void rename() },
    // Типова тематика (key !== null) не видаляється — сервер поверне 400.
    ...(view.group.key === null
      ? [
          {
            key: "remove",
            label: "Прибрати групу",
            icon: "trash",
            onSelect: () => void remove(),
          } satisfies MenuItem,
        ]
      : []),
  ];

  return (
    <section className="wb-group">
      <div className="wb-group-head">
        <button
          type="button"
          className="wb-group-toggle"
          aria-expanded={open}
          aria-labelledby={titleId}
          onClick={() => onToggle(view.group.id)}
        >
          <Icon name={open ? "chevron-down" : "chevron-right"} size={16} />
          <span id={titleId} className="wb-group-title">
            {view.group.title}
          </span>
          {/* Рахунок рекурсивний: згорнутий заголовок каже, скільки мірок під ним. */}
          <span className="wb-group-count">{view.count}</span>
        </button>
        <button
          type="button"
          className="wb-group-actions"
          aria-label={`Дії групи ${view.group.title}`}
          onClick={() => setMenu(true)}
        >
          <Icon name="more" size={18} />
        </button>
      </div>
      {open && (
        <div className="wb-group-body">
          {view.children.map((child) => (
            <TrackerGroupSection
              key={child.group.id}
              view={child}
              depth={depth + 1}
              cellsOf={cellsOf}
              today={today}
              saving={saving}
              isOpen={isOpen}
              onToggle={onToggle}
              ordering={ordering}
              onMoveTracker={onMoveTracker}
              onOpenTracker={onOpenTracker}
              onSave={onSave}
              onCreateGroup={onCreateGroup}
              onUpdateGroup={onUpdateGroup}
              onDeleteGroup={onDeleteGroup}
            />
          ))}
          <ul className="wb-matrix-list">
            {view.trackers.map((tracker, index) => (
              <TrackerMatrixRow
                key={tracker.id}
                tracker={tracker}
                cells={cellsOf(tracker)}
                today={today}
                saving={saving}
                ordering={ordering}
                first={index === 0}
                last={index === view.trackers.length - 1}
                onOpen={() => onOpenTracker(tracker.id)}
                onSave={(value, note) => onSave(tracker.id, value, note)}
                onMove={(direction) => onMoveTracker(tracker.id, direction)}
              />
            ))}
          </ul>
        </div>
      )}
      {menu && <MenuModal title={view.group.title} items={items} onClose={() => setMenu(false)} />}
    </section>
  );
}
