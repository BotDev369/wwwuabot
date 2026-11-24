/**
 * Сайдбар платформи — та сама коробка `SideBar`, що в адмінці: тут лишається
 * рівно склад пунктів. Пункти — **список головної** (`PlatformNavList`), а не
 * друга навігація: людина бачить у меню те саме, що й на обкладинці.
 *
 * @module web-platform-dev/src/layout/PlatformSidebar
 */
import type { ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { MENU_LABEL, SideBar } from "@wwwuabot/ui/nav";
import { Icon, themeById, useStyleTheme } from "@wwwuabot/shared";
import type { ScreenRow } from "@wwwuabot/shared/screens";
import { PlatformNavList } from "./PlatformNavList";
import { platformNav, type PlatformNavGroup } from "./screen-nav";

interface PlatformSidebarProps {
  /** Екрани з реєстру: підпис, іконка й адреса пункту живуть у базі. */
  screens: readonly ScreenRow[];
  /** Поточна адреса — для підсвіченого пункту. */
  pathname: string;
  /** Виїзне меню відкрите (телефон). */
  open?: boolean;
  /** Закрити меню: хрестик у верхньому рядку або перехід за пунктом. */
  onClose?: () => void;
}

export function PlatformSidebar({
  screens,
  pathname,
  open = false,
  onClose,
}: PlatformSidebarProps): ReactElement {
  const navigate = useNavigate();
  const { scheme, setScheme } = useStyleTheme();
  const dark = scheme === "dark";
  // «Головна» — перший пункт меню й окремою групою: це повернення на обкладинку,
  // а не ще один розділ серед розділів. Пункт — дані, тож і додається до груп.
  const groups: PlatformNavGroup[] = [
    {
      key: "home",
      title: null,
      items: [
        {
          key: "home",
          label: "Головна",
          icon: "home",
          href: "/",
          active: pathname === "/",
        },
      ],
    },
    ...platformNav(screens, pathname),
  ];

  return (
    <SideBar
      className={`wb-platform-sidebar${open ? " wb-platform-sidebar--open" : ""}`}
      // Верхній рядок меню стоїть рівно на місці хедера, який меню накриває:
      // слово «Меню» ліворуч, дві круглі дії праворуч — тема й закриття.
      // Хрестик закриття тут **один**: власний рядок коробки (`onClose`) не
      // передаємо, бо двоє виходів з одного меню читались як дві дії.
      header={
        <div className="wb-platform-menutop">
          <p className="wb-platform-menutop__word">{MENU_LABEL}</p>
          <div className="wb-platform-menutop__actions">
            <button
              type="button"
              className="wb-platform-theme"
              aria-label={`Тема: ${themeById(scheme).label}`}
              onClick={() => setScheme(dark ? "light" : "dark")}
            >
              <Icon name={dark ? "moon" : "sun"} size={20} />
            </button>
            <button
              type="button"
              className="wb-platform-close"
              aria-label="Закрити меню"
              onClick={() => onClose?.()}
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>
      }
    >
      <PlatformNavList
        groups={groups}
        label="Навігація платформи"
        className="wb-platform-nav"
        // Перехід у межах SPA: повне перезавантаження в TWA втрачає стан.
        // Дотик по пункту закриває меню — інакше воно лишалось би поверх нової
        // сторінки.
        onNavigate={(href) => {
          navigate(href);
          onClose?.();
        }}
      />
    </SideBar>
  );
}
