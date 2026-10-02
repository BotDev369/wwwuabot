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
 * **«Назад» знає тільки оболонка**, бо вона одна володіє роутером: повертає на
 * попередній екран (`-1`, тож саме туди, звідки прийшли). Палітра ж не
 * навігація, а поверхня — меню теми живе тут, у каркасі, і закривається тим
 * самим дотиком, яким відкрилася.
 *
 * @module web-platform-dev/src/layout/PlatformShell
 */

import { useCallback, useState, type ReactElement } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppBar, ScreenChromeProvider } from "@wwwuabot/ui/nav";
import { ThemeMenu } from "@/pages/themes/ThemeMenu";
import { PlatformTabBar } from "./PlatformTabBar";

export function PlatformShell(): ReactElement {
  const navigate = useNavigate();
  const goBack = useCallback(() => void navigate(-1), [navigate]);
  const [themeOpen, setThemeOpen] = useState(false);
  const closeTheme = useCallback(() => setThemeOpen(false), []);

  return (
    <ScreenChromeProvider>
      <div className="wb-tabbar-layout">
        <AppBar onBack={goBack} onTheme={() => setThemeOpen(true)} />
        <Outlet />
        <PlatformTabBar />
      </div>
      {themeOpen && <ThemeMenu onClose={closeTheme} />}
    </ScreenChromeProvider>
  );
}
