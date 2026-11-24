/**
 * `AppBar` — хедер платформи: крохи зліва, гамбургер справа. І більше нічого:
 * ні бренду, ні слова «МЕНЮ», ні дій сторінки — «Поділитись» і серце сховані.
 * Про роутер хедер не знає: перехід передає оболонка, висоту — `useAppBarHeight`.
 *
 * @module packages/ui/src/nav/AppBar
 */

import { useContext, useRef, type ReactElement } from "react";
import { ScreenChromeContext, type ScreenChrome, type ScreenCrumb } from "./screen-chrome";
import { useAppBarHeight } from "./useAppBarHeight";
import { MenuButton } from "./MenuButton";

/** Дії, які знає тільки оболонка: вона одна володіє роутером. */
export interface AppBarActions {
  /**
   * Готовий стан хедера, якщо його порахував каркас: крохи будуються з реєстру
   * екранів, і лише оболонка знає, який розділ стоїть над сторінкою.
   */
  chrome?: ScreenChrome;
  /** Перехід за рівнем шляху: хедер не знає про роутер. */
  onNavigate?: (href: string) => void;
  /** Відкрити або закрити меню продукту (правий сайдбар). */
  onMenu?: () => void;
  /** Меню відкрите — для `aria-expanded` і стану знака. */
  menuOpen?: boolean;
}

export function AppBar({
  chrome: given,
  onMenu,
  onNavigate,
  menuOpen = false,
}: AppBarActions): ReactElement | null {
  const chrome = given ?? useContext(ScreenChromeContext)?.chrome;
  if (!chrome) return null;
  return <AppBarView chrome={chrome} onMenu={onMenu} onNavigate={onNavigate} menuOpen={menuOpen} />;
}

/**
 * Сама розмітка хедера — окремо від контексту, щоб її можна було перевірити
 * тестом без рендеру оболонки: що показується, а що прибирається.
 */
export function AppBarView({
  chrome,
  onMenu,
  onNavigate,
  menuOpen = false,
}: { chrome: ScreenChrome } & AppBarActions): ReactElement {
  const { title, ancestors } = chrome;
  const header = useRef<HTMLElement>(null);
  // Останній рівень — поточна сторінка; попередні — її батьки (з реєстру).
  const trail: readonly ScreenCrumb[] = title
    ? [...ancestors, { label: title, href: null }]
    : ancestors;

  useAppBarHeight(header);

  return (
    <header className="wb-appbar" ref={header}>
      {trail.length > 0 && (
        <nav className="wb-appbar__trail" aria-label="Шлях сторінки">
          {trail.map((crumb, index) => {
            const current = index === trail.length - 1;
            const label = crumb.label;
            return (
              <span className="wb-appbar__step" key={`${index}-${label}`}>
                {index > 0 && (
                  <span className="wb-appbar__sep" aria-hidden="true">
                    ›
                  </span>
                )}
                {current || !crumb.href || !onNavigate ? (
                  current ? (
                    <h1 className="wb-appbar__crumb wb-appbar__crumb--current" title={label}>
                      {label}
                    </h1>
                  ) : (
                    <span className="wb-appbar__crumb" title={label}>
                      {label}
                    </span>
                  )
                ) : (
                  <a
                    className="wb-appbar__crumb wb-appbar__crumb--link"
                    href={crumb.href}
                    title={label}
                    onClick={(event) => {
                      // SPA-перехід: повне перезавантаження в TWA втрачає стан.
                      if (event.metaKey || event.ctrlKey || event.shiftKey) return;
                      event.preventDefault();
                      onNavigate(crumb.href as string);
                    }}
                  >
                    {label}
                  </a>
                )}
              </span>
            );
          })}
        </nav>
      )}

      {onMenu && (
        <div className="wb-appbar__actions">
          <MenuButton open={menuOpen} onClick={onMenu} />
        </div>
      )}
    </header>
  );
}
