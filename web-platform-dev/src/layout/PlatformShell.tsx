/**
 * Каркас платформи: хедер, сайдбар і сторінка.
 *
 * **Навігація — правий сайдбар.** Меню — один список без «Ще», який виїжджає
 * справа поверх сторінки; тему й усі пункти видно лише тоді, коли людина сама
 * відкрила меню. Склад пунктів, їхні підписи й місце в меню приходять із
 * реєстру екранів (`ScreensProvider` → `/api/screens`), а не з коду.
 *
 * **Хлібний шлях рахує каркас.** Екран каже лише назву з даних («Кроки»,
 * «Астрагал»); розділ і підрозділи будуються з `parent_key` за адресою. Тому
 * новий крок не забуває про старі, а перейменування розділу змінює крохи в
 * усіх його сторінках.
 *
 * @module web-platform-dev/src/layout/PlatformShell
 */

import { useCallback, useContext, useEffect, useState, type ReactElement } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppBar, ScreenChromeContext, ScreenChromeProvider } from "@wwwuabot/ui/nav";
import { apiFetch } from "@/shared/api/client";
import { JournalBridge } from "./JournalBridge";
import { PlatformSidebar } from "./PlatformSidebar";
import { ScreensProvider } from "./ScreensProvider";
import { useScreens } from "./useScreens";
import { screenTrail } from "./screen-trail";

/**
 * Ім'я бота для діплінків; `null`, поки не відомо.
 *
 * Адреса — платформна (`/api/user/bot`), а не адмінська `/api/bot/info`: Mini
 * App ходить із `initData`, тож адмін-гейт за cookie віддав би йому 401.
 */
function useBotUsername(): string | null {
  const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    apiFetch<{ username?: string | null }>("/api/user/bot")
      .then((info) => {
        if (!cancelled) setUsername(info.username ?? null);
      })
      .catch(() => {
        if (!cancelled) setUsername(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return username;
}

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
  const botUsername = useBotUsername();

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  const trail = screenTrail(rows, pathname, chrome?.title ?? null);
  // Назву й крохи дає реєстр; екран лише уточнює назву з даних (трекер, товар).
  // Тому екран без `useScreenChrome` більше не лишається без шапки.
  const current = chrome?.title ?? trail[trail.length - 1]?.label ?? null;
  const shellChrome = {
    ...(chrome ?? EMPTY_SHELL_CHROME),
    title: current,
    ancestors: trail.slice(0, -1),
  };

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
        <AppBar
          chrome={shellChrome}
          onMenu={toggleNav}
          menuOpen={navOpen}
          botUsername={botUsername}
          onNavigate={(href) => {
            navigate(href);
            closeNav();
          }}
        />
        <Outlet />
      </div>
    </div>
  );
}

/**
 * Оболонка, яка не є екраном: вітрина входу. Сайдбар і хедер тут були б другою
 * шапкою над власною шапкою екрана.
 */
function EntryFrame(): ReactElement {
  return (
    <>
      <JournalBridge />
      <Outlet />
    </>
  );
}

export function PlatformShell(): ReactElement {
  const { pathname } = useLocation();

  return (
    <ScreensProvider>
      <ScreenChromeProvider>
        {pathname === "/" ? <EntryFrame /> : <PlatformFrame />}
      </ScreenChromeProvider>
    </ScreensProvider>
  );
}

/**
 * Порожній стан хедера для адреси, яку екран ще не оголосив.
 *
 * Крохи й назву дає реєстр, тож екран без `useScreenChrome` більше не лишається
 * без шапки; дії (поділитись, серце, меню сторінки) лишаються `null`.
 */
const EMPTY_SHELL_CHROME = {
  title: null,
  ancestors: [],
  titleMode: "header",
  menu: null,
  share: null,
  favorite: null,
} as const;
