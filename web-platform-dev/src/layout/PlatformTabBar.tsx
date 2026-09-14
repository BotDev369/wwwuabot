/**
 * Нижній футер платформи.
 *
 * Тут лише те, чим платформа відрізняється від адмінки: її пункти, її роутер
 * і її реакція на пункт-заглушку. Сама смуга — спільний `TabBar`.
 *
 * @module web-platform-dev/src/layout/PlatformTabBar
 */

import type { ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDialog } from "@wwwuabot/ui/dialog";
import { TabBar, buildTabBarItems } from "@wwwuabot/ui/nav";
import { PLATFORM_TABS, toShellTabs } from "./platform-tabs";

export function PlatformTabBar(): ReactElement {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dialog = useDialog();

  const items = buildTabBarItems({
    tabs: toShellTabs(PLATFORM_TABS),
    pathname,
    navigate,
    onPlaceholder: (tab) => {
      void dialog.alert(`Розділ «${tab.label}» ще в розробці.`, { title: "Скоро" });
    },
  });

  return <TabBar items={items} label="Навігація платформи" />;
}
