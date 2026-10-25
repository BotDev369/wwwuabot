/**
 * «Що додати?» — вибір між трекером і групою. Спершу питання, а не дія: знак
 * «+» обіцяв би одну кнопку, за якою стоять дві різні речі.
 *
 * @module web-platform-dev/src/pages/trackers/TrackerAddMenu
 */

import type { ReactElement } from "react";
import { MenuModal, type MenuItem } from "@wwwuabot/ui/menu";

export function TrackerAddMenu({
  onNewTracker,
  onNewGroup,
  onClose,
}: {
  onNewTracker: () => void;
  /** Створення групи питає назву — звідси йде вже намір, а не готова група. */
  onNewGroup: () => void;
  onClose: () => void;
}): ReactElement {
  const items: MenuItem[] = [
    { key: "tracker", label: "Трекер", icon: "bar-chart", onSelect: onNewTracker },
    { key: "group", label: "Група", icon: "folder", onSelect: onNewGroup },
  ];
  return <MenuModal title="Що додати?" items={items} onClose={onClose} />;
}
