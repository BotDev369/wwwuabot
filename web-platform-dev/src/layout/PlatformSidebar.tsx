/**
 * Сайдбар платформи — та сама коробка `SideBar`, що в адмінці: тут лишається
 * рівно склад пунктів. Він завжди поверхня, яка виїжджає справа; тему й
 * підсвічений пункт тримає сама панель, а не хедер.
 *
 * @module web-platform-dev/src/layout/PlatformSidebar
 */

import type { ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SideBar, SideBarMenu } from "@wwwuabot/ui/nav";
import { Icon, SwitchRow, themeById, useStyleTheme } from "@wwwuabot/shared";
import { platformNav } from "./platform-nav";

interface PlatformSidebarProps {
  /** Виїзне меню відкрите (телефон). */
  open?: boolean;
  /** Закрити поверхню: хрестик у самому меню або дотик повз нього. */
  onClose?: () => void;
}

export function PlatformSidebar({ open = false, onClose }: PlatformSidebarProps): ReactElement {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { scheme, setScheme } = useStyleTheme();
  const dark = scheme === "dark";

  return (
    <SideBar
      className={`wb-platform-sidebar${open ? " wb-platform-sidebar--open" : ""}`}
      onClose={onClose}
    >
      {/* Тема — першим пунктом меню: це стан усього продукту, а не дія
          сторінки, тож вона не має губитись серед переходів. */}
      <div className="wb-platform-theme">
        <span className="wb-platform-theme__icon" aria-hidden="true">
          <Icon name={dark ? "moon" : "sun"} size={20} />
        </span>
        <SwitchRow
          label="Тема"
          hint={themeById(scheme).label}
          checked={dark}
          onToggle={(on) => setScheme(on ? "dark" : "light")}
        />
      </div>
      <SideBarMenu
        sections={platformNav(pathname)}
        label="Навігація платформи"
        // Перехід у межах SPA: повне перезавантаження в TWA втрачає стан.
        // Дотик по пункту на телефоні закриває меню — інакше воно лишалось би
        // поверх нової сторінки.
        navigate={(href) => {
          navigate(href);
          onClose?.();
        }}
      />
    </SideBar>
  );
}
