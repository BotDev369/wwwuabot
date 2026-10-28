/**
 * Каркас платформи: хедер + сторінка + глобальний нижній футер. Хедер і футер
 * стоять ПОЗА сторінкою, тож є на кожному екрані (`ScreenChromeProvider` тут,
 * бо хедер малює каркас, а знає про себе той екран, який відкрито). «Назад»
 * знає тільки оболонка — вона одна володіє роутером; меню теми теж поверхня
 * каркаса, тож закривається тим самим дотиком, яким відкрилося.
 *
 * @module web-platform-dev/src/layout/PlatformShell
 */

import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppBar, ScreenChromeProvider } from "@wwwuabot/ui/nav";
import { ThemeMenu } from "@/pages/themes/ThemeMenu";
import { apiFetch } from "@/shared/api/client";
import { JournalBridge } from "./JournalBridge";
import { PlatformTabBar } from "./PlatformTabBar";

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
  const navigate = useNavigate();
  const goBack = useCallback(() => void navigate(-1), [navigate]);
  const [themeOpen, setThemeOpen] = useState(false);
  const closeTheme = useCallback(() => setThemeOpen(false), []);
  const botUsername = useBotUsername();
  return (
    <ScreenChromeProvider>
      {/* Журнал бачить «відкрив сторінку», «відкрив модалку» й дії в них — а не
          запити, які екран зробив сам. */}
      <JournalBridge />
      <div className="wb-tabbar-layout">
        <AppBar onBack={goBack} onTheme={() => setThemeOpen(true)} botUsername={botUsername} />
        <Outlet />
        <PlatformTabBar />
      </div>
      {themeOpen && <ThemeMenu onClose={closeTheme} />}
    </ScreenChromeProvider>
  );
}
