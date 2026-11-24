/**
 * Каркас платформи: верхівка екрана, хедер, сайдбар і сторінка.
 * Один підхід на всі екрани: рідна шапка Telegram, графічна верхівка її ж
 * кольором, крохи зліва й гамбургер справа, без повного екрана; системна
 * «назад» веде в історію. Правила — `docs/PLATFORM.md`.
 *
 * @module web-platform-dev/src/layout/PlatformShell
 */

import { useCallback, useContext, useEffect, useState, type ReactElement } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppBar, ScreenChromeContext, ScreenChromeProvider } from "@wwwuabot/ui/nav";
import { JournalBridge } from "./JournalBridge";
import { PlatformSidebar } from "./PlatformSidebar";
import { ScreensProvider } from "./ScreensProvider";
import { shellChromeFor } from "./shell-chrome";
import { sectionTone } from "./screen-tone";
import { useScreens } from "./useScreens";

/** Скільки рівнів верхівки знає продукт: 1 — розділ, 2 — підрозділ, 3 — сторінка. */
const MAX_DEPTH = 3;

/**
 * Внутрішній каркас: стоїть **усередині** провайдерів, бо крохи потребують і
 * назву з екрана, і реєстр із бази.
 */
function PlatformFrame(): ReactElement {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const chrome = useContext(ScreenChromeContext)?.chrome;
  const { rows } = useScreens();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const toggleNav = useCallback(() => setNavOpen((current) => !current), []);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  // Назву й крохи дає реєстр; екран лише уточнює назву з даних (трекер, товар).
  const shellChrome = shellChromeFor(chrome, rows, pathname);
  // Головна — обкладинка від самого верху: нашого хедера на ній немає зовсім,
  // а рідний хедер Telegram фарбується кольором верхньої смуги графіки.
  const isHome = pathname === "/";
  // Глибина — це й «сутність» сторінки: розділ, підрозділ чи сторінка в ньому.
  const depth = Math.min(
    MAX_DEPTH,
    Math.max(1, shellChrome.ancestors.length + (shellChrome.title ? 1 : 0)),
  );

  useEffect(() => {
    const root = document.documentElement;
    if (isHome) root.setAttribute("data-chrome", "hero");
    else root.removeAttribute("data-chrome");
    return () => root.removeAttribute("data-chrome");
  }, [isHome]);

  // Повноекранного режиму більше немає ніде: рідна шапка клієнта лишається на
  // кожному екрані — як на головній. `exitFullscreen` — лише прибиральник:
  // клієнт, що зайшов у повний екран раніше (стара сесія), мусить із нього
  // вийти, інакше шапки не буде видно взагалі.
  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    try {
      webApp?.exitFullscreen?.();
    } catch {
      /* клієнт не знає методу — лишається як є */
    }
  }, []);

  // «Назад» веде назад, а не закриває застосунок. Поки `BackButton` прихована,
  // Telegram закриває Mini App системною кнопкою; показана — віддає натиск нам.
  // На головній історії немає: там кнопку ховаємо, і клієнт малює «✕».
  useEffect(() => {
    const back = window.Telegram?.WebApp?.BackButton;
    if (!back?.show) return;
    if (isHome) {
      back.hide?.();
      return;
    }
    const onBack = () => {
      const index = (window.history.state as { idx?: number } | null)?.idx ?? 0;
      if (index > 0) navigate(-1);
      else navigate("/", { replace: true });
    };
    back.onClick?.(onBack);
    back.show();
    return () => back.offClick?.(onBack);
  }, [isHome, navigate]);

  return (
    <div className="wb-platform">
      {/* Журнал бачить «відкрив сторінку», «відкрив модалку» й дії в них — а не
          запити, які екран зробив сам. */}
      <JournalBridge />
      <PlatformSidebar open={navOpen} onClose={closeNav} screens={rows} pathname={pathname} />
      {navOpen && (
        <button
          type="button"
          className="wb-platform-scrim"
          aria-label="Закрити меню"
          onClick={closeNav}
        />
      )}
      <div className="wb-platform-main">
        <div className="wb-screen" data-depth={depth} data-tone={sectionTone(pathname)}>
          {/* Верхівка екрана — декорація: вона не приймає дотиків і не несе
              змісту, тож від скрінрідера схована. */}
          {!isHome && <div className="wb-screen-cover" aria-hidden="true" />}
          {!isHome && (
            <AppBar
              chrome={shellChrome}
              onMenu={toggleNav}
              menuOpen={navOpen}
              onNavigate={(href) => {
                navigate(href);
                closeNav();
              }}
            />
          )}
          <Outlet />
        </div>
      </div>
    </div>
  );
}

/**
 * Оболонка платформи — **без винятків для вітрини**: `/` теж екран реєстру
 * (`entry`), тож він живе в тому самому каркасі. Другої шапки немає: свою
 * брендову строку вітрина не малює.
 */
export function PlatformShell(): ReactElement {
  return (
    <ScreensProvider>
      <ScreenChromeProvider>
        <PlatformFrame />
      </ScreenChromeProvider>
    </ScreensProvider>
  );
}
