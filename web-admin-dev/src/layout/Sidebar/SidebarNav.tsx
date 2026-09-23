/**
 * Пункти меню адмінки — у спільному сайдбарі.
 *
 * Склад береться зі store (`useAdminNav`), а **вигляд рендерить спільний
 * `SideBarMenu`** (`@wwwuabot/ui/nav`) — той самий, що панель розділів Простору
 * й список розділів теми. Тут лишається рівно те, чим адмінка відрізняється:
 * її пункти, її адреси й закриття виїзного меню після переходу.
 *
 * @module web-admin-dev/src/layout/Sidebar/SidebarNav
 */

import { useLocation, useNavigate } from "react-router-dom";
import { SideBarMenu, isTabActive } from "@wwwuabot/ui/nav";
import { useAdminNav } from "./adminNav.store";

interface SidebarNavProps {
  collapsed: boolean;
  /** Клік по пункту меню: на мобільному закриває drawer. */
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed, onNavigate }: SidebarNavProps) {
  const sections = useAdminNav((state) => state.sections);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <SideBarMenu
      collapsed={collapsed}
      label="Розділи панелі"
      // Активність рахує **та сама** функція, що у футера (`isTabActive`): два
      // правила «котра сторінка поточна» розійшлися б на першій же вкладеній
      // адресі.
      sections={sections.map((section, index) => ({
        key: section.title ?? `section-${index}`,
        title: section.title ?? undefined,
        items: section.items.map((item) => ({
          key: item.to,
          label: item.label,
          icon: item.icon,
          href: item.to,
          active: isTabActive(pathname, item.to),
          onSelect: () => {
            // Навігацію робить оболонка (react-router): повне перезавантаження
            // в TWA — це втрачений стан і біла вспишка.
            navigate(item.to);
            onNavigate?.();
          },
        })),
      }))}
    />
  );
}
