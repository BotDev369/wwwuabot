import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { HomePage } from "../pages/home/HomePage";
import { ScenariosPage } from "../pages/scenarios/ScenariosPage";
import { UsersPage } from "../pages/users/UsersPage";
import { PageBuilderPage } from "../features/page-builder/PageBuilderPage";
import { BotSettingsPage } from "../pages/bot-settings/BotSettingsPage";
import { SitesPage } from "../pages/sites/SitesPage";
import { SitesModerationPage } from "../pages/sites/SitesModerationPage";
import { TemplatesPage } from "../pages/sites/TemplatesPage";

/**
 * Маршрути web-admin.
 *
 * /scenarios          — Сценарії
 * /page-builder/:cw   — Конструктор сторінок
 * /users              — Користувачі
 * /sites              — Всі сайти
 * /sites/moderation   — Модерація
 * /templates          — Шаблони
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
      { path: "sites", element: <SitesPage /> },
      { path: "sites/moderation", element: <SitesModerationPage /> },
      { path: "templates", element: <TemplatesPage /> },
    ],
  },
]);
