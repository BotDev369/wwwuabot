/**
 * Каркас платформи: хедер + сторінка + глобальний нижній футер. Хедер і футер
 * стоять ПОЗА сторінкою, тож є на кожному екрані (`ScreenChromeProvider` тут,
 * бо хедер малює каркас, а знає про себе той екран, який відкрито). «Назад»
 * знає тільки оболонка — вона одна володіє роутером; меню теми теж поверхня
 * каркаса, тож закривається тим самим дотиком, яким відкрилося.
 *
 * @module web-platform-dev/src/layout/PlatformShell
 */

import { useCallback, useState, type ReactElement } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AppBar, ScreenChromeProvider } from "@wwwuabot/ui/nav";
import { ThemeMenu } from "@/pages/themes/ThemeMenu";
import { JournalBridge } from "./JournalBridge";
import { PlatformTabBar } from "./PlatformTabBar";

export function PlatformShell(): ReactElement {
  const navigate = useNavigate();
  const goBack = useCallback(() => void navigate(-1), [navigate]);
  const [themeOpen, setThemeOpen] = useState(false);
  const closeTheme = useCallback(() => setThemeOpen(false), []);
  return (
    <ScreenChromeProvider>
      {/* Журнал бачить «відкрив сторінку», «відкрив модалку» й дії в них — а не
          запити, які екран зробив сам. */}
      <JournalBridge />
      <div className="wb-tabbar-layout">
        <AppBar onBack={goBack} onTheme={() => setThemeOpen(true)} />
        <Outlet />
        <PlatformTabBar />
      </div>
      {themeOpen && <ThemeMenu onClose={closeTheme} />}
    </ScreenChromeProvider>
  );
}
