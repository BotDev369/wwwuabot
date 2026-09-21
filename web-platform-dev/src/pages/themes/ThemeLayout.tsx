/**
 * Каркас розділу «Тема»: сторінка + друга смуга футера.
 *
 * **Місце під смугу лишає саме він** (`.wb-subbar-layout`): перша смуга тримає
 * своє (`PlatformShell`), а друга — додатковий відступ унизу. Без цього
 * остання картка схеми назавжди лишалась би під смугою.
 *
 * Смуга стоїть **на рівні маршруту**, а не в кожній сторінці: вона належить
 * розділу, тож перехід між його сторінками її не перемальовує — і вибраний
 * пункт не блимає.
 *
 * @module web-platform-dev/src/pages/themes/ThemeLayout
 */

import type { ReactElement } from "react";
import { Outlet } from "react-router-dom";
import { ThemeSubBar } from "@/layout/ThemeSubBar";

export function ThemeLayout(): ReactElement {
  return (
    <div className="wb-subbar-layout">
      <Outlet />
      <ThemeSubBar />
    </div>
  );
}
