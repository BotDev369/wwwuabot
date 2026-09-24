import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { HomePage } from "../pages/home/HomePage";
import { ScenariosPage } from "../pages/scenarios/ScenariosPage";
import { UsersPage } from "../pages/users/UsersPage";
import { PageBuilderPage } from "../features/page-builder/PageBuilderPage";
import { BotSettingsPage } from "../pages/bot-settings/BotSettingsPage";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { MonitoringPage } from "../pages/monitoring/MonitoringPage";

/**
 * Маршрути web-admin.
 *
 * /scenarios          — Сценарії
 * /page-builder/:cw   — Конструктор сторінок
 * /users              — Користувачі
 * /monitoring         — Моніторинг проєкту: зрізи код/GitHub, динаміка, історія
 * /bot-settings       — Налаштування бота
 * /profile            — Профіль (акаунт панелі + профіль людини) — той самий
 *                       екран, що й у платформі, зі спільного `UserProfileCard`;
 *                       не рядок контенту, тому не `/:slug`.
 *
 * Маршрутів «сайтів» (`/sites`, `/sites/moderation`) і «шаблонів» тут більше
 * немає: таблиці `sites`, `site_pages`, `templates` видалено 13.09.2026, бо
 * вони дублювали `scenarios`. Контент живе в одному рядку `scenarios` —
 * сторінка вебу разом із її поданням у боті.
 */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "scenarios", element: <ScenariosPage /> },
      { path: "page-builder/:slug", element: <PageBuilderPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "monitoring", element: <MonitoringPage /> },
      { path: "bot-settings", element: <BotSettingsPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
]);
