/**
 * Каркас платформи: хедер + сторінка + глобальний нижній футер.
 *
 * Хедер і футер стоять ПОЗА сторінкою, тож вони є на кожному екрані — і на
 * вмісті з `scenarios`, і на фолбеку, і на екрані завантаження.
 * `.wb-tabbar-layout` лишає під футер місце у потоці (смуга фіксована) —
 * стилі в `app-chrome.css`.
 *
 * `ScreenChromeProvider` стоїть тут, бо хедер малюється в каркасі, а знає про
 * себе той екран, який зараз відкрито (`useScreenChrome`).
 *
 * **Дві дії хедера знає лише оболонка**, бо вона одна володіє роутером:
 * «Назад» повертає на попередній екран (`-1`, тож саме туди, звідли прийшли),
 * а палітра відкриває **сторінку** теми (`/profile/theme`), а не аркуш поверх
 * екрана — у теми є розділи зі своїми адресами.
 *
 * @module web-platform-dev/src/layout/PlatformShell
 */

import { useCallback, type ReactElement } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppBar, ScreenChromeProvider } from "@wwwuabot/ui/nav";
import { THEME_PATH } from "@/app/routes";
import { PlatformTabBar } from "./PlatformTabBar";

export function PlatformShell(): ReactElement {
  const navigate = useNavigate();
  const goBack = useCallback(() => void navigate(-1), [navigate]);
  const openTheme = useCallback(() => void navigate(THEME_PATH), [navigate]);

  return (
    <ScreenChromeProvider>
      <div className="wb-tabbar-layout">
        <AppBar onBack={goBack} onTheme={openTheme} />
        <Outlet />
        <PlatformTabBar />
      </div>
    </ScreenChromeProvider>
  );
}
