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
 * `/profile`, `/create`, `/space`, `/notes`, `/contacts` і `/messages` стоять
 * **перед** catch-all навмисно: це єдині екрани, які не є рядком контенту
 * (`slug`). Їхні адреси дає `app/routes.ts` — один власник на маршрут і пункт
 * навігації.
 *
 * Сторінка людини в Просторі (`/space/u/:id`) і гра (`/space/g/:key`) стоять
 * перед `/space` **порядком рядків**: довший шлях мусить збігтися першим,
 * інакше `/space` з'їв би його хвіст.
 */

import { createBrowserRouter } from "react-router-dom";
import { PlatformShell } from "@/layout/PlatformShell";
import {
  CONTACTS_ROUTE,
  CREATE_ROUTE,
  MESSAGES_PATH,
  NOTES_ROUTE,
  PROFILE_ACCOUNT_PATH,
  PROFILE_ROUTE,
  SPACE_GAME_ROUTE,
  SPACE_ROUTE,
  SPACE_USER_ROUTE,
  THEME_ROUTE,
} from "@/app/routes";
import { ContactsPage } from "@/pages/ContactsPage";
import { CreatePage } from "@/pages/CreatePage";
import { MessagesPage } from "@/pages/MessagesPage";
import { NotesPage } from "@/pages/NotesPage";
import { ProfileAccountPage } from "@/pages/ProfileAccountPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ScenarioPage } from "@/pages/ScenarioPage";
import { SpaceGamePage } from "@/pages/games/SpaceGamePage";
import { SpacePage } from "@/pages/SpacePage";
import { SpaceUserPage } from "@/pages/SpaceUserPage";
import { ThemeLayout } from "@/pages/themes/ThemeLayout";
import { ThemeHubPage } from "@/pages/themes/ThemeHubPage";
import { ThemeCustomizePage } from "@/pages/themes/ThemeCustomizePage";
import { ThemePresetsPage } from "@/pages/themes/ThemePresetsPage";
import { ThemeStylePage } from "@/pages/themes/ThemeStylePage";

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
      // Тема — розділ зі **своїми сторінками**: у кожного розділу є адреса
      // (посилання, історія, «назад»), а між ними веде друга смуга футера
      // (`ThemeLayout`). Три пункти — три сторінки; джерела тем (платформа,
      // свої, з простору) діляться вкладками всередині `presets`.
      // Склад розділів — `pages/themes/theme-sections.ts`; маршрути мусять
      // збігатися з ним, і це стереже `theme-sections.test.ts`.
      {
        path: `${PROFILE_ROUTE}/${THEME_ROUTE}`,
        element: <ThemeLayout />,
        children: [
          { index: true, element: <ThemeHubPage /> },
          { path: "style", element: <ThemeStylePage /> },
          { path: "presets", element: <ThemePresetsPage /> },
          { path: "customize", element: <ThemeCustomizePage /> },
        ],
      },
      // Створити — хаб власних екранів людини, слот «+» у футері: у кожного
      // пункту два входи, «подивитись» і «створити».
      { path: CREATE_ROUTE, element: <CreatePage /> },
      // Простір — відкрита стрічка: відкриті профілі (а далі оголошення).
      // Довший шлях іде першим — інакше `/space` перехопив би людину в Просторі.
      { path: `${SPACE_ROUTE}/${SPACE_USER_ROUTE}/:id`, element: <SpaceUserPage /> },
      // Гра — своя адреса під тим самим «порядком рядків»: `/space/g/:key`
      // довший за `/space`, і без цього рядка він потрапив би в catch-all і
      // відкрив би сторінку контенту під назвою «g».
      { path: `${SPACE_ROUTE}/${SPACE_GAME_ROUTE}/:key`, element: <SpaceGamePage /> },
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
