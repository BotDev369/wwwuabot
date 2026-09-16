/**
 * Нижній футер платформи.
 *
 * Тут лише те, чим платформа відрізняється від адмінки: її пункти, її роутер
 * і її реакція на пункт-заглушку. Сама смуга — спільний `TabBar`.
 *
 * Центральний «+» відкриває спільний композер: «створити» — це дія, а не
 * розділ, і адреси під нею немає.
 *
 * @module web-platform-dev/src/layout/PlatformTabBar
 */

import { useState, type ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ComposerModal } from "@wwwuabot/ui/composer";
import { useDialog } from "@wwwuabot/ui/dialog";
import { TabBar, buildTabBarItems, withPrimaryAction } from "@wwwuabot/ui/nav";
import { PLATFORM_TABS, toShellTabs } from "./platform-tabs";

export function PlatformTabBar(): ReactElement {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const dialog = useDialog();
  const [composerOpen, setComposerOpen] = useState(false);

  const items = buildTabBarItems({
    tabs: withPrimaryAction(toShellTabs(PLATFORM_TABS), () => setComposerOpen(true)),
    pathname,
    navigate,
    onPlaceholder: (tab) => {
      void dialog.alert(`Розділ «${tab.label}» ще в розробці.`, { title: "Скоро" });
    },
  });

  return (
    <>
      <TabBar items={items} label="Навігація платформи" />
      {composerOpen && <ComposerModal onClose={() => setComposerOpen(false)} />}
    </>
  );
}
