/**
 * Сайдбар платформи: **та сама коробка, що в адмінці**.
 *
 * Пункти, мірки, «тут ти» й кнопка закриття живуть у спільному `SideBar`
 * (`@wwwuabot/ui/nav`), а тут лишається рівно те, чим платформа відрізняється
 * від панелі: її лого й склад пунктів. Другої розмітки сайдбара в продукті
 * немає — інакше два меню почали б розходитись на першій же правці.
 *
 * **На телефоні це поверхня, на десктопі — колонка.** Різницю тримає CSS
 * (`.wb-platform-sidebar`), а не JS: ширина екрана — це медіазапит, і
 * перемикати його станом React означало б мигнути меню на першому рендері.
 *
 * @module web-platform-dev/src/layout/PlatformSidebar
 */

import type { ReactElement } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SideBar, SideBarMenu } from "@wwwuabot/ui/nav";
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

  return (
    <SideBar
      className={`wb-platform-sidebar${open ? " wb-platform-sidebar--open" : ""}`}
      onClose={onClose}
      header={
        <div className="wb-nav-header">
          <span className="wb-nav-logo" aria-hidden="true">
            ✦
          </span>
          <span className="wb-nav-title">ПАЛЯНИЦЯ</span>
        </div>
      }
    >
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
