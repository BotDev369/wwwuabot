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
 * @module web-platform-dev/src/layout/PlatformShell
 */

import type { ReactElement } from "react";
import { Outlet } from "react-router-dom";
import { AppBar, ScreenChromeProvider } from "@wwwuabot/ui/nav";
import { PlatformTabBar } from "./PlatformTabBar";

export function PlatformShell(): ReactElement {
  return (
    <ScreenChromeProvider>
      <div className="wb-tabbar-layout">
        <AppBar />
        <Outlet />
        <PlatformTabBar />
      </div>
    </ScreenChromeProvider>
  );
}
