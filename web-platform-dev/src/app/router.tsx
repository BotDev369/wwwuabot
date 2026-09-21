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
 * `/profile`, `/space`, `/notes`, `/contacts` і `/messages` стоять **перед**
 * catch-all навмисно: це єдині екрани, які не є рядком контенту (`slug`). Їхні
 * адреси дає `app/routes.ts` — один власник на маршрут і пункт навігації.
 *
 * Сторінка людини в Просторі (`/space/u/:id`) стоїть перед `/space` **порядком
 * рядків**: довший шлях мусить збігтися першим, інакше `/space` з'їв би його
 * хвіст.
 */

import { createBrowserRouter } from "react-router-dom";
import { PlatformShell } from "@/layout/PlatformShell";
import {
  CONTACTS_ROUTE,
  MESSAGES_PATH,
  NOTES_ROUTE,
  PROFILE_ACCOUNT_PATH,
  PROFILE_ROUTE,
  SPACE_ROUTE,
  SPACE_USER_ROUTE,
} from "@/app/routes";
import { ContactsPage } from "@/pages/ContactsPage";
import { MessagesPage } from "@/pages/MessagesPage";
import { NotesPage } from "@/pages/NotesPage";
import { ProfileAccountPage } from "@/pages/ProfileAccountPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ScenarioPage } from "@/pages/ScenarioPage";
import { SpacePage } from "@/pages/SpacePage";
import { SpaceUserPage } from "@/pages/SpaceUserPage";

export const router = createBrowserRouter([
  {
    element: <PlatformShell />,
    children: [
      // Профіль — не контент, а дані користувача: хаб із рядком акаунта й
      // розділами платформи.
      { path: PROFILE_ROUTE, element: <ProfilePage /> },
      // Акаунт — окрема адреса під хабу: платформа й Telegram окремими
      // розділами, а не одним суцільним списком.
      { path: PROFILE_ACCOUNT_PATH, element: <ProfileAccountPage /> },
      // Простір — відкрита стрічка: відкриті профілі (а далі оголошення).
      // Довший шлях іде першим — інакше `/space` перехопив би людину в Просторі.
      { path: `${SPACE_ROUTE}/${SPACE_USER_ROUTE}/:id`, element: <SpaceUserPage /> },
      { path: SPACE_ROUTE, element: <SpacePage /> },
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
