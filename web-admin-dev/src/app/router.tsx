import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { HomePage } from "../pages/home/HomePage";
import { ScenariosPage } from "../pages/scenarios/ScenariosPage";
import { UsersPage } from "../pages/users/UsersPage";
import { PageBuilderPage } from "../features/page-builder/PageBuilderPage";
import { BotSettingsPage } from "../pages/bot-settings/BotSettingsPage";

/**
 * Маршрути web-admin.
 *
 * /scenarios          — Сценарії (єдина сторінка з перемикачем Portal/Admin)
 * /page-builder/:cw   — Конструктор сторінок
 * /users              — Користувачі
 */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "scenarios", element: <ScenariosPage /> },
      { path: "page-builder/:codeword", element: <PageBuilderPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "bot-settings", element: <BotSettingsPage /> },
    ],
  },
]);
