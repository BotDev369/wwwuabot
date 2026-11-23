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
import { shellChromeFor } from "./shell-chrome";
import { useScreens } from "./useScreens";

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

  // Назву й крохи дає реєстр; екран лише уточнює назву з даних (трекер, товар).
  // Тому екран без `useScreenChrome` не лишається без шапки, а вітрина `/` —
  // такий самий екран, як решта.
  const shellChrome = shellChromeFor(chrome, rows, pathname);
  // Головна — обкладинка: назва продукту на ній, у хедері лишається «МЕНЮ».
  const isHome = pathname === "/";

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
          hideBrand={isHome}
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
 * Оболонка платформи — **без винятків для вітрини**: `/` теж екран реєстру
 * (`entry`), тож він живе в тому самому каркасі з тим самим хедером. Другої
 * шапки немає: свою брендову строку вітрина більше не малює.
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
