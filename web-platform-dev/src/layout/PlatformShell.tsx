/**
 * Каркас платформи: сторінка + глобальний нижній футер.
 *
 * Футер стоїть ПОЗА сторінкою, тож він є на кожному екрані — і на вмісті з
 * `scenarios`, і на фолбеку, і на екрані завантаження. `.wb-tabbar-layout`
 * лишає під нього місце у потоці (смуга фіксована) — стилі в `app-chrome.css`.
 *
 * @module web-platform-dev/src/layout/PlatformShell
 */

import type { ReactElement } from "react";
import { Outlet } from "react-router-dom";
import { PlatformTabBar } from "./PlatformTabBar";

export function PlatformShell(): ReactElement {
  return (
    <div className="wb-tabbar-layout">
      <Outlet />
      <PlatformTabBar />
    </div>
  );
}
