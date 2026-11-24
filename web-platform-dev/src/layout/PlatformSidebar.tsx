/**
 * Сайдбар платформи — та сама коробка `SideBar`, що в адмінці: тут лишається
 * рівно склад пунктів. Пункти — **список головної** (`PlatformNavList`), а не
 * друга навігація: людина бачить у меню те саме, що й на обкладинці. Пошук
 * фільтрує цей самий список, а не заводить другу навігацію.
 *
 * @module web-platform-dev/src/layout/PlatformSidebar
 */
import { useEffect, useRef, useState, type ReactElement } from "react";
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
  const [query, setQuery] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  const closeRef = useRef<HTMLButtonElement>(null);
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

  // Меню — поверхня на весь екран: фокус входить у неї разом із нею, інакше
  // Tab вів би сторінку під меню. Закриття повертає фокус туди, звідки прийшли
  // (це робить каркас).
  useEffect(() => {
    if (open) closeRef.current?.focus({ preventScroll: true });
  }, [open]);

  // Запит живе разом із меню: наступного разу поле чисте. Це та сама правка,
  // що й "adjusting state when a prop changes" — без ефекту й зайвого рендера.
  if (open !== wasOpen) {
    if (!open) setQuery("");
    setWasOpen(open);
  }

  const needle = query.trim().toLowerCase();
  const shown =
    needle === ""
      ? groups
      : groups
          .map((group) => ({
            ...group,
            items: group.items.filter((item) => item.label.toLowerCase().includes(needle)),
          }))
          .filter((group) => group.items.length > 0);

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
              ref={closeRef}
              onClick={() => onClose?.()}
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>
      }
    >
      {/* Поле над списком, а не в хедері: воно фільтрує саме пункти меню.
          `type="search"` дає нативне очищення там, де воно є. */}
      <div className="wb-platform-search" role="search">
        <span className="wb-platform-search__box">
          <span className="wb-platform-search__icon" aria-hidden="true">
            <Icon name="search" size={18} />
          </span>
          <input
            className="wb-platform-search__field"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Пошук розділу"
            placeholder="Знайти розділ"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
          />
        </span>
      </div>

      {shown.length > 0 ? (
        <PlatformNavList
          groups={shown}
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
      ) : (
        <p className="wb-platform-search-empty">Нічого не знайдено</p>
      )}
    </SideBar>
  );
}
