import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { HomePage } from "../pages/home/HomePage";
import { ScenariosPage } from "../pages/scenarios/ScenariosPage";
import { UsersPage } from "../pages/users/UsersPage";
import { AccessRequestsPage } from "../pages/messages/AccessRequestsPage";
import { PageBuilderPage } from "../features/page-builder/PageBuilderPage";
import { BotSettingsPage } from "../pages/bot-settings/BotSettingsPage";
import { ProfilePage } from "../pages/profile/ProfilePage";
import { MonitoringPage } from "../pages/monitoring/MonitoringPage";
import { SpendingHubPage } from "../pages/spending/SpendingHubPage";
import { SpendingOrgsPage } from "../pages/spending/SpendingOrgsPage";
import { SpendingPaymentsPage } from "../pages/spending/SpendingPaymentsPage";
import { SpendingCodesPage } from "../pages/spending/SpendingCodesPage";
import { SpendingRecipientsPage } from "../pages/spending/SpendingRecipientsPage";
import { SpendingSyncPage } from "../pages/spending/SpendingSyncPage";
import { AnalyticsPage } from "../pages/analytics/AnalyticsPage";

/**
 * Маршрути web-admin.
 *
 * /platform           — Платформа: сторінки й екрани (блоки `page_data`)
 * /bot                — Бот: повідомлення, фото, кнопки, rich-розмітка
 * /scenarios          — стара адреса списку; веде на «Платформу»
 * /page-builder/:cw   — Конструктор сторінок
 * /users              — Користувачі
 * /messages           — Повідомлення: звернення зі сторінки відмови, повний
 *                       CRUD з панелі (`/api/admin/access-requests`)
 * /analytics          — Аналітика поведінки: журнал дій людей (бот і платформа),
 *                       по користувачах або за діапазоном часу
 * /monitoring         — Моніторинг проєкту: зрізи код/GitHub, динаміка, історія
 * /spending           — Є-data: хаб можливостей — картки ведуть на власні
 *                       сторінки, а не збирають усе в одну таблицю
 * /spending/orgs      — розпорядники й договори обраного розпорядника
 * /spending/payments   — наскрізний список сплат громади за період
 * /spending/codes     — КЕКВ, КПК і бюджетна програма
 * /spending/recipients — отримувачі: топ за сумою у вибраному вікні
 * /spending/sync      — стан збору: кроки, помилки, довідка джерела
 * /style              — Візуал: одна демосторінка продукту — шапка, блоки,
 *                       графіки, поля, навігація й перемикач тем, плюс
 *                       відбиток CSS, що каже про оновлення вигляду
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
      { path: "platform", element: <ScenariosPage surface="platform" /> },
      { path: "bot", element: <ScenariosPage surface="bot" /> },
      // Старе посилання не має вести на 404: рядки ті самі, змінився лише
      // вхід. `replace` — щоб «назад» не вертало на переадресацію.
      { path: "scenarios", element: <Navigate to="/platform" replace /> },
      { path: "page-builder/:slug", element: <PageBuilderPage /> },
      { path: "users", element: <UsersPage /> },
      { path: "messages", element: <AccessRequestsPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "monitoring", element: <MonitoringPage /> },
      { path: "spending", element: <SpendingHubPage /> },
      { path: "spending/orgs", element: <SpendingOrgsPage /> },
      { path: "spending/payments", element: <SpendingPaymentsPage /> },
      { path: "spending/codes", element: <SpendingCodesPage /> },
      { path: "spending/recipients", element: <SpendingRecipientsPage /> },
      { path: "spending/sync", element: <SpendingSyncPage /> },
      // Сторінка-демо вантажиться ліниво: вхід в адмінку не має чекати на
      // полотно, яке відкривають зрідка (`npm run check:bundle`).
      {
        path: "style",
        lazy: () => import("../pages/style/StylePage").then((m) => ({ Component: m.StylePage })),
      },
      { path: "bot-settings", element: <BotSettingsPage /> },
      { path: "profile", element: <ProfilePage /> },
    ],
  },
]);
