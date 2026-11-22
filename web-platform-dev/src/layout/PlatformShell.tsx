/**
 * Каркас платформи: хедер, сайдбар і сторінка.
 *
 * **Навігація — правий сайдбар, а не футер.** П'ять слотів унизу змушували
 * кожну нову річ або тіснитись у «Сервіси», або не потрапляти нікуди. Тепер
 * меню — один список без «Ще», який виїжджає справа поверх сторінки; тему й
 * усі пункти видно лише тоді, коли людина сама відкрила меню.
 *
 * **Меню — стан каркаса, а не екрана.** Хедер, сайдбар і скрим живуть тут, бо
 * лише каркас знає, що меню відкрите; сторінка про це не здогадується й не
 * тримає в собі кнопку. Хедер показує той самий бренд і «МЕНЮ» на кожному
 * екрані, а назву сторінки бере з її оголошення (`useScreenChrome`).
 *
 * @module web-platform-dev/src/layout/PlatformShell
 */

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AppBar, ScreenChromeProvider } from "@wwwuabot/ui/nav";
import { apiFetch } from "@/shared/api/client";
import { JournalBridge } from "./JournalBridge";
import { PlatformSidebar } from "./PlatformSidebar";

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

export function PlatformShell(): ReactElement {
  const { pathname } = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const toggleNav = useCallback(() => setNavOpen((current) => !current), []);
  const botUsername = useBotUsername();

  // Escape закриває меню, як модалку: на телефоні це єдиний спосіб вийти з
  // нього, не цілячись у хрестик.
  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setNavOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navOpen]);

  // Вітрина — обкладинка, а не кабінет: сайдбар і хедер тут були б другою
  // шапкою над власною шапкою екрана.
  if (pathname === "/") {
    return (
      <ScreenChromeProvider>
        <JournalBridge />
        <Outlet />
      </ScreenChromeProvider>
    );
  }

  return (
    <ScreenChromeProvider>
      {/* Журнал бачить «відкрив сторінку», «відкрив модалку» й дії в них — а не
          запити, які екран зробив сам. */}
      <JournalBridge />
      <div className="wb-platform">
        <PlatformSidebar open={navOpen} onClose={closeNav} />
        {navOpen && (
          <button
            type="button"
            className="wb-platform-scrim"
            aria-label="Закрити меню"
            onClick={closeNav}
          />
        )}
        <div className="wb-platform-main">
          <AppBar onMenu={toggleNav} menuOpen={navOpen} botUsername={botUsername} />
          <Outlet />
        </div>
      </div>
    </ScreenChromeProvider>
  );
}
