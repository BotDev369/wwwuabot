/**
 * Нижній футер адмінки.
 *
 * Тут лише те, чим адмінка відрізняється від платформи: її пункти, її роутер
 * і її реакція на пункт-заглушку. Сама смуга — спільний `TabBar`.
 *
 * Центральний «+» відкриває спільний композер: «створити» — це дія, а не
 * розділ, і адреси під нею немає.
 *
 * @module web-admin-dev/src/layout/AdminTabBar
 */

import { useState, type ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ComposerModal } from "@wwwuabot/ui/composer";
import { useDialog } from "@wwwuabot/ui/dialog";
import { TabBar, buildTabBarItems, withPrimaryAction } from "@wwwuabot/ui/nav";
import { ADMIN_TABS } from "./admin-tabs";

export function AdminTabBar(): ReactElement {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dialog = useDialog();
  const [composerOpen, setComposerOpen] = useState(false);

  const items = buildTabBarItems({
    tabs: withPrimaryAction(ADMIN_TABS, () => setComposerOpen(true)),
    pathname,
    navigate,
    onPlaceholder: (tab) => {
      void dialog.alert(`Розділ «${tab.label}» ще в розробці.`, { title: "Скоро" });
    },
  });

  return (
    <>
      <TabBar items={items} label="Навігація адмінки" />
      {composerOpen && <ComposerModal onClose={() => setComposerOpen(false)} />}
    </>
  );
}
