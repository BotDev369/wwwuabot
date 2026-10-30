import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { HomePage } from "../pages/home/HomePage";
import { ScenariosPage } from "../pages/scenarios/ScenariosPage";
import { UsersPage } from "../pages/users/UsersPage";
import { AccessRequestsPage } from "../pages/messages/AccessRequestsPage";
import { PageBuilderPage } from "../features/page-builder/PageBuilderPage";
import { BotSettingsPage } from "../pages/bot-settings/BotSettingsPage";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { MonitoringPage } from "../pages/monitoring/MonitoringPage";
import { AnalyticsPage } from "../pages/analytics/AnalyticsPage";
import { StylePage } from "../pages/style/StylePage";

/**
 * Маршрути web-admin.
 *
 * /scenarios          — Сценарії
 * /page-builder/:cw   — Конструктор сторінок
 * /users              — Користувачі
 * /messages           — Повідомлення: звернення зі сторінки відмови, повний
 *                       CRUD з панелі (`/api/admin/access-requests`)
 * /analytics          — Аналітика поведінки: журнал дій людей (бот і платформа),
 *                       по користувачах або за діапазоном часу
 * /monitoring         — Моніторинг проєкту: зрізи код/GitHub, динаміка, історія
 * /style              — Інвентар вигляду: токени, кирпичики й класи так, як вони
 *                       є в CSS (каталог генерує `npm run doc:style`)
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
      { path: "messages", element: <AccessRequestsPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "monitoring", element: <MonitoringPage /> },
      { path: "style", element: <StylePage /> },
      { path: "bot-settings", element: <BotSettingsPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
]);
