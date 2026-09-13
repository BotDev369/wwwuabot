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
 * /scenarios          — Сценарії
 * /page-builder/:cw   — Конструктор сторінок
 * /users              — Користувачі
 * /bot-settings       — Налаштування бота
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
      { path: "page-builder/:codeword", element: <PageBuilderPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "bot-settings", element: <BotSettingsPage /> },
    ],
  },
]);
