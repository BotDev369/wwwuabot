import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { HomePage } from "../pages/home/HomePage";
import { ScenariosAdminPage } from "../pages/scenarios/ScenariosAdminPage";
import { UsersPage } from "../pages/users/UsersPage";
import { ScenariosV2Page } from "../pages/scenarios-v2/ScenariosV2Page";

/**
 * Маршрути web-admin.
 *
 * /scenarios-admin — Сценарії-портал (таблиця scenarios-admin)
 * /scenarios       — Сценарії-адмін (таблиця scenarios)
 * /users           — Користувачі
 */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "scenarios", element: <ScenariosV2Page /> },
      { path: "scenarios-admin", element: <ScenariosAdminPage /> },
      { path: "users", element: <UsersPage /> },
    ],
  },
]);
