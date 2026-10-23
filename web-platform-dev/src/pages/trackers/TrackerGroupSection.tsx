/**
 * Група-акордеон: заголовок із рахунком і діями, всередині — підгрупи
 * (рекурсивно) й рядки-матриці. Залита тільки назва; порожня група теж
 * видима — людина її створила. Дії — меню на все вікно (AGENTS.md §4), типову
 * тематику каталогу прибрати не можна.
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
  onOpenTracker: (id: number) => void;
  onSave: (trackerId: number, value: number, note: string) => Promise<boolean>;
  onCreateGroup: (title: string, parentId: number | null) => Promise<TrackerGroup | null>;
  onUpdateGroup: (
    id: number,
    patch: { title?: string; parentId?: number | null },
  ) => Promise<boolean>;
  onDeleteGroup: (id: number) => Promise<boolean>;
  /** «Новий трекер» — форма відкривається з цією групою вже обраною. */
  onNewTracker: (groupId: number) => void;
  /** «Прибрати трекери групи» — типова тематика лишається, мірки зникають. */
  onClearTrackers: (groupId: number) => Promise<number | null>;
}

export function TrackerGroupSection({
  view,
  depth,
  cellsOf,
  today,
  saving,
  isOpen,
  onToggle,
  onOpenTracker,
  onSave,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onNewTracker,
  onClearTrackers,
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
      `Видалити «${view.group.title}»? Трекери й підгрупи піднімуться вище.`,
      { tone: "danger", confirmText: "Видалити" },
    );
    if (ok) await onDeleteGroup(view.group.id);
  }

  async function clearTrackers(): Promise<void> {
    const ok = await dialog.confirm(
      `Прибрати ${view.count} з «${view.group.title}»? Сама тематика лишиться в «Моїх».`,
      { tone: "danger", confirmText: "Прибрати" },
    );
    if (ok) await onClearTrackers(view.group.id);
  }

  // Діалог відкривається після закриття меню: дві поверхні одна над одною
  // лишали людину в меню після скасування.
  function run(action: () => void | Promise<void>): void {
    setMenu(false);
    void action();
  }

  const items: MenuItem[] = [
    { key: "sub", label: "Додати підгрупу", icon: "plus", onSelect: () => run(addSubgroup) },
    {
      key: "tracker",
      label: "Новий трекер",
      icon: "bar-chart",
      onSelect: () => run(() => onNewTracker(view.group.id)),
    },
    { key: "rename", label: "Перейменувати", icon: "edit", onSelect: () => run(rename) },
    // Типова тематика (key !== null) не видаляється — її рядок сіється знову,
    // тож у неї прибирають уміст: мірки зникають, заголовок лишається.
    view.group.key === null
      ? { key: "remove", label: "Видалити групу", icon: "trash", onSelect: () => run(remove) }
      : {
          key: "clear",
          label: "Прибрати трекери групи",
          icon: "trash",
          onSelect: () => run(clearTrackers),
        },
  ];

  return (
    <section className={"wb-group" + (depth > 0 ? " wb-group--sub" : "")}>
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
              onOpenTracker={onOpenTracker}
              onSave={onSave}
              onCreateGroup={onCreateGroup}
              onUpdateGroup={onUpdateGroup}
              onDeleteGroup={onDeleteGroup}
              onNewTracker={onNewTracker}
              onClearTrackers={onClearTrackers}
            />
          ))}
          <ul className="wb-matrix-list">
            {view.trackers.map((tracker) => (
              <TrackerMatrixRow
                key={tracker.id}
                tracker={tracker}
                cells={cellsOf(tracker)}
                today={today}
                saving={saving}
                onOpen={() => onOpenTracker(tracker.id)}
                onSave={(value, note) => onSave(tracker.id, value, note)}
              />
            ))}
          </ul>
        </div>
      )}
      {menu && (
        <MenuModal
          title={view.group.title}
          variant="card"
          items={items}
          onClose={() => setMenu(false)}
        />
      )}
    </section>
  );
}
