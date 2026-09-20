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
 * `/profile`, `/notes`, `/contacts` і `/messages` стоять **перед** catch-all
 * навмисно: це єдині екрани, які не є рядком контенту (`slug`). Їхні адреси
 * дає `app/routes.ts` — один власник на маршрут і пункт навігації.
 */

import { createBrowserRouter } from "react-router-dom";
import { PlatformShell } from "@/layout/PlatformShell";
import { CONTACTS_ROUTE, MESSAGES_PATH, NOTES_ROUTE, PROFILE_ROUTE } from "@/app/routes";
import { ContactsPage } from "@/pages/ContactsPage";
import { MessagesPage } from "@/pages/MessagesPage";
import { NotesPage } from "@/pages/NotesPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ScenarioPage } from "@/pages/ScenarioPage";

export const router = createBrowserRouter([
  {
    element: <PlatformShell />,
    children: [
      // Профіль — не контент, а дані користувача: той самий екран, що в
      // адмінці, плюс розділи платформи (хаб).
      { path: PROFILE_ROUTE, element: <ProfilePage /> },
      // Нотатки — власні дані людини (таблиця `notes`), не рядок `scenarios`
      { path: NOTES_ROUTE, element: <NotesPage /> },
      // Контакти — довідник людини (таблиця `contacts`), теж не рядок контенту
      { path: CONTACTS_ROUTE, element: <ContactsPage /> },
      // Повідомлення — переписка людей (таблиці `conversations`/`messages`).
      // Адреса зі спільного складу футера: пункт і маршрут — один факт.
      { path: MESSAGES_PATH, element: <MessagesPage /> },
      // Catch-all: сторінка за її адресою
      { path: "*", element: <ScenarioPage /> },
    ],
  },
]);
