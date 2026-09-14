/**
 * Нижній футер адмінки.
 *
 * Тут лише те, чим адмінка відрізняється від платформи: її пункти, її роутер
 * і її реакція на пункт-заглушку. Сама смуга — спільний `TabBar`.
 *
 * @module web-admin-dev/src/layout/AdminTabBar
 */

import type { ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDialog } from "@wwwuabot/ui/dialog";
import { TabBar, buildTabBarItems } from "@wwwuabot/ui/nav";
import { ADMIN_TABS } from "./admin-tabs";

export function AdminTabBar(): ReactElement {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dialog = useDialog();

  const items = buildTabBarItems({
    tabs: ADMIN_TABS,
    pathname,
    navigate,
    onPlaceholder: (tab) => {
      void dialog.alert(`Розділ «${tab.label}» ще в розробці.`, { title: "Скоро" });
    },
  });

  return <TabBar items={items} label="Навігація адмінки" />;
}
