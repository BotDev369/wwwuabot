/**
 * «Групи» — дерево груп: дії рядка в меню «···», порядок стрілками ⬆/⬇
 * (рух робить сервер). Групу каталогу (`key !== null`) не прибрати — сервер
 * чинить опір, тож пункту немає.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerGroupsModal
 */

import { useState, type ReactElement } from "react";
import { Icon } from "@wwwuabot/shared";
import { MenuModal, type MenuItem } from "@wwwuabot/ui/menu";
import { useDialog } from "@wwwuabot/ui/dialog";
import type { TrackerGroup } from "@wwwuabot/shared/trackers";
import { groupTreeLines } from "./trackers-view";

interface TrackerGroupsModalProps {
  groups: readonly TrackerGroup[];
  onClose: () => void;
  onCreate: (title: string, parentId: number | null) => Promise<TrackerGroup | null>;
  onUpdate: (id: number, patch: { title?: string; parentId?: number | null }) => Promise<boolean>;
  onDelete: (id: number) => Promise<boolean>;
  onMove: (id: number, direction: "up" | "down") => Promise<boolean>;
}

export function TrackerGroupsModal({
  groups,
  onClose,
  onCreate,
  onUpdate,
  onDelete,
  onMove,
}: TrackerGroupsModalProps): ReactElement {
  const dialog = useDialog();
  const [menu, setMenu] = useState<TrackerGroup | null>(null);

  const validate = (value: string): string | null => (value.trim() ? null : "Порожньо");

  async function rename(group: TrackerGroup): Promise<void> {
    const title = await dialog.prompt("Назва групи:", {
      defaultValue: group.title,
      validate,
    });
    if (title !== null) await onUpdate(group.id, { title: title.trim() });
  }

  async function addGroup(titlePrompt: string, parentId: number | null): Promise<void> {
    const title = await dialog.prompt(titlePrompt, { validate });
    if (title !== null) await onCreate(title.trim(), parentId);
  }

  async function remove(group: TrackerGroup): Promise<void> {
    const ok = await dialog.confirm(
      `Прибрати «${group.title}»? Трекери й підгрупи піднімуться вище.`,
      { tone: "danger", confirmText: "Прибрати" },
    );
    if (ok) await onDelete(group.id);
  }

  // Меню рядка закривається перед діалогом: три поверхні одна над одною
  // лишають людину в ній же й після скасування.
  function rowItems(group: TrackerGroup): MenuItem[] {
    const close = (): void => setMenu(null);
    return [
      {
        key: "sub",
        label: "Додати підгрупу",
        icon: "plus",
        onSelect: () => {
          close();
          void addGroup("Назва підгрупи:", group.id);
        },
      },
      {
        key: "rename",
        label: "Перейменувати",
        icon: "edit",
        onSelect: () => {
          close();
          void rename(group);
        },
      },
      ...(group.key === null
        ? [
            {
              key: "remove",
              label: "Прибрати групу",
              icon: "trash",
              onSelect: () => {
                close();
                void remove(group);
              },
            } satisfies MenuItem,
          ]
        : []),
    ];
  }

  return (
    <>
      <MenuModal
        title="Групи"
        onClose={onClose}
        content={
          <div className="wb-groups-mgr">
            <div className="wb-groups-mgr-top">
              <button
                type="button"
                className="wb-btn wb-btn-primary"
                onClick={() => void addGroup("Назва групи:", null)}
              >
                Нова група
              </button>
            </div>
            <ul className="wb-groups-mgr-list">
              {groupTreeLines(groups).map(({ group, depth, first, last }) => (
                <li
                  key={group.id}
                  className="wb-groups-mgr-row"
                  style={{ marginInlineStart: depth * 16 }}
                >
                  <span className="wb-groups-mgr-title">{group.title}</span>
                  <button
                    type="button"
                    className="wb-groups-mgr-btn"
                    aria-label={`Перемістити вгору: ${group.title}`}
                    disabled={first}
                    onClick={() => void onMove(group.id, "up")}
                  >
                    <Icon name="arrow-up" size={16} />
                  </button>
                  <button
                    type="button"
                    className="wb-groups-mgr-btn"
                    aria-label={`Перемістити вниз: ${group.title}`}
                    disabled={last}
                    onClick={() => void onMove(group.id, "down")}
                  >
                    <Icon name="arrow-down" size={16} />
                  </button>
                  <button
                    type="button"
                    className="wb-groups-mgr-btn"
                    aria-label={`Дії групи ${group.title}`}
                    onClick={() => setMenu(group)}
                  >
                    <Icon name="more" size={18} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        }
      />
      {menu && (
        <MenuModal title={menu.title} items={rowItems(menu)} onClose={() => setMenu(null)} />
      )}
    </>
  );
}
