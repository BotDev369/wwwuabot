/**
 * Новий трекер — модалка екрана, а не блок під списком: створення не розсуває
 * дерево, а закривається адресою (`?new=1`). Сама форма живе окремо й
 * перевіряється окремо; тут лише поверхня.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerCreateModal
 */

import type { ReactElement } from "react";
import { MenuModal } from "@wwwuabot/ui/menu";
import type { Tracker, TrackerFields, TrackerGroup } from "@wwwuabot/shared/trackers";
import { TrackerCreateForm } from "./TrackerCreateForm";

interface TrackerCreateModalProps {
  groups: readonly TrackerGroup[];
  /** Група з адреси (`group=<id>`): форма відкрита з меню самої групи. */
  initialGroupId: number | null;
  onCreate: (fields: TrackerFields, groupId: number | null) => Promise<Tracker | null>;
  onCreated: (tracker: Tracker) => void;
  onCancel: () => void;
  onCreateGroup: (title: string) => Promise<TrackerGroup | null>;
}

export function TrackerCreateModal({
  groups,
  initialGroupId,
  onCreate,
  onCreated,
  onCancel,
  onCreateGroup,
}: TrackerCreateModalProps): ReactElement {
  return (
    <MenuModal
      title="Новий трекер"
      variant="card"
      onClose={onCancel}
      content={
        <TrackerCreateForm
          groups={groups}
          initialGroupId={initialGroupId}
          onCreate={onCreate}
          onCreated={onCreated}
          onCancel={onCancel}
          onCreateGroup={onCreateGroup}
        />
      }
    />
  );
}
