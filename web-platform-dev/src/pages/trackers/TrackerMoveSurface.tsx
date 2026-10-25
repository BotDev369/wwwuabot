/**
 * Поверхня переміщення: знаходить те, що переміщують (групу чи трекер), і
 * показує дерево місць. Сторінка лише каже, що саме обрали в меню, — дерево,
 * теперішнє місце й заборонена гілка живуть тут.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerMoveSurface
 */

import type { ReactElement } from "react";
import { TRACKER_OWN_GROUP_KEY, type Tracker, type TrackerGroup } from "@wwwuabot/shared/trackers";
import { TrackerMoveModal } from "./TrackerMoveModal";
import { groupSubtreeIds } from "./trackers-view";

/** Що переміщують: група міняє батька, трекер — групу. */
export interface MovingTarget {
  kind: "group" | "tracker";
  id: number;
}

interface TrackerMoveSurfaceProps {
  moving: MovingTarget | null;
  groups: readonly TrackerGroup[];
  trackers: readonly Tracker[];
  onClose: () => void;
  onMoveGroup: (id: number, parentId: number | null) => Promise<boolean>;
  onMoveTracker: (id: number, groupId: number | null) => Promise<boolean>;
}

export function TrackerMoveSurface({
  moving,
  groups,
  trackers,
  onClose,
  onMoveGroup,
  onMoveTracker,
}: TrackerMoveSurfaceProps): ReactElement | null {
  if (!moving) return null;

  if (moving.kind === "group") {
    const group = groups.find((candidate) => candidate.id === moving.id);
    if (!group) return null;
    return (
      <TrackerMoveModal
        name={group.title}
        groups={groups}
        currentId={group.parentId}
        rootLabel="Верхній рівень"
        excludeIds={groupSubtreeIds(groups, group.id)}
        onClose={onClose}
        onPick={(parentId) => {
          onClose();
          void onMoveGroup(group.id, parentId);
        }}
      />
    );
  }

  const tracker = trackers.find((candidate) => candidate.id === moving.id);
  if (!tracker) return null;
  // Трекер без групи живе в «Своїх»: рядок кореня мусить казати «Тут».
  const ownId = groups.find((group) => group.key === TRACKER_OWN_GROUP_KEY)?.id ?? null;
  return (
    <TrackerMoveModal
      name={tracker.title}
      groups={groups}
      currentId={tracker.groupId ?? ownId}
      rootLabel="Свої"
      onClose={onClose}
      onPick={(groupId) => {
        onClose();
        void onMoveTracker(tracker.id, groupId);
      }}
    />
  );
}
