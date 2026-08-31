import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { HomePage } from "../pages/home/HomePage";
import { ScenariosAdminPage } from "../pages/scenarios/ScenariosAdminPage";
import { UsersPage } from "../pages/users/UsersPage";
import { ScenariosV2Page } from "../pages/scenarios-v2/ScenariosV2Page";
import { PageBuilderPage } from "../features/page-builder/PageBuilderPage";

/**
 * Маршрути web-admin.
 *
 * /scenarios          — Сценарії-портал (таблиця scenarios)
 * /scenarios-admin    — Сценарії-адмін (таблиця scenarios-admin)
 * /page-builder/:cw   — Конструктор сторінок
 * /users              — Користувачі
 */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "scenarios", element: <ScenariosV2Page /> },
      { path: "scenarios-admin", element: <ScenariosAdminPage /> },
      { path: "page-builder/:codeword", element: <PageBuilderPage /> },
      { path: "users", element: <UsersPage /> },
    ],
  },
]);
