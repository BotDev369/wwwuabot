/**
 * Router — кожен URL рендериться сторінкою контенту.
 *
 * Тут рівно один маршрут, і це не спрощення заради спрощення: `/sites`,
 * `/sites/new`, `/catalog` і `/view/:slug` були другою навігацією по тому
 * самому контенту — окремою ієрархією «сайтів», що лежала в своїх таблицях
 * (`sites`, `site_pages`, `templates`). Таблиці видалено 13.09.2026, бо
 * сторінка одна: `/:path` — адреса рядка контенту, а хвіст адреси — його
 * параметри (`/mydate/1980-03-03/today` → сторінка `mydate`).
 *
 * Сторінка завернута в `PlatformShell`: каркас (глобальний нижній футер) не
 * належить жодній сторінці, тож він стоїть на рівні маршруту, а не всередині
 * `ScenarioPage`.
 *
 * `/profile` стоїть **перед** catch-all навмисно: це єдиний екран, який не є
 * рядком контенту (`slug`) — профіль складається з даних користувача, а не зі
 * `page_data`. Тому він і має власний маршрут, а не адресу-заглушку в базі.
 */

import { createBrowserRouter } from "react-router-dom";
import { PlatformShell } from "@/layout/PlatformShell";
import { ProfilePage } from "@/pages/ProfilePage";
import { ScenarioPage } from "@/pages/ScenarioPage";

export const router = createBrowserRouter([
  {
    element: <PlatformShell />,
    children: [
      // Профіль — не контент, а дані користувача
      { path: "profile", element: <ProfilePage /> },
      // Catch-all: сторінка за її адресою
      { path: "*", element: <ScenarioPage /> },
    ],
  },
]);
