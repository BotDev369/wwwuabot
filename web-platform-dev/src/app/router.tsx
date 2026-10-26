/**
 * Router — кожен URL рендериться сторінкою контенту.
 *
 * Тут рівно один маршрут, і це не спрощення заради спрощення: `/sites`,
 * `/sites/new`, `/catalog` і `/view/:slug` були другою навігацією по тому
 * самому контенту — окремою ієрархією «сайтів», що лежала в своїх таблицях
 * (`sites`, `site_pages`, `templates`). Таблиці видалено 13.09.2026, бо
 * сторінка одна: `/:path` — адреса рядка контенту, а хвіст адреси — його
 * параметри (`/dateanalysis/1980-03-03/today` → сторінка `dateanalysis`).
 *
 * Сторінка завернута в `PlatformShell`: каркас (глобальний нижній футер) не
 * належить жодній сторінці, тож він стоїть на рівні маршруту, а не всередині
 * `ScenarioPage`.
 *
 * `/account`, `/orders`, `/ads`, `/games`, `/users`, `/notes`, `/contacts`,
 * `/messages` і `/pages` стоять **перед** catch-all навмисно: це єдині екрани,
 * які не є рядком контенту (`slug`). Їхні адреси дає `app/routes.ts` — один
 * власник на маршрут і пункт навігації. Саме тому ці сегменти не можуть стати
 * адресою сторінки людини: їх стереже `pages/user-pages/page-address.test.ts`.
 *
 * Партія (`/games/:key`) стоїть перед `/games` **порядком рядків**: довший шлях
 * мусить збігтися першим, інакше `/games` з'їв би його хвіст.
 */

import { createBrowserRouter, Navigate } from "react-router-dom";
import { PlatformShell } from "@/layout/PlatformShell";
import {
  ADS_ROUTE,
  CONTACTS_ROUTE,
  FAVORITES_ROUTE,
  ACCOUNT_PATH,
  ACCOUNT_ROUTE,
  ASSESSMENTS_ROUTE,
  GAMES_ROUTE,
  MESSAGES_PATH,
  NOTES_ROUTE,
  ORDERS_ROUTE,
  PAGE_EDIT_ROUTE,
  PAGES_NEW_ROUTE,
  PAGES_ROUTE,
  SHOP_ORDERS_ROUTE,
  SHOP_PRODUCTS_ROUTE,
  SERVICES_ROUTE,
  TRACKERS_ROUTE,
  USERS_ROUTE,
} from "@/app/routes";
import { AdsPage } from "@/pages/AdsPage";
import { ContactsPage } from "@/pages/ContactsPage";
import { FavoritesPage } from "@/pages/favorites/FavoritesPage";
import { TrackersPage } from "@/pages/trackers/TrackersPage";
import { AssessmentsScreen } from "@/pages/assessments/AssessmentsScreen";
import { MessagesPage } from "@/pages/MessagesPage";
import { NotesPage } from "@/pages/NotesPage";
import { ProfileAccountPage } from "@/pages/ProfileAccountPage";
import { ProfileOrdersPage } from "@/pages/ProfileOrdersPage";
import { ServicesPage } from "@/pages/ServicesPage";
import { ScenarioPage } from "@/pages/ScenarioPage";
import { UsersPage } from "@/pages/UsersPage";
import { GamePage } from "@/pages/games/GamePage";
import { GamesPage } from "@/pages/games/GamesPage";
import { PageCreatePage } from "@/pages/user-pages/PageCreatePage";
import { PageEditPage } from "@/pages/user-pages/PageEditPage";
import { ShopOrderPage } from "@/pages/shop/ShopOrderPage";
import { ShopOrdersPage } from "@/pages/shop/ShopOrdersPage";
import { ShopProductForm } from "@/pages/shop/ShopProductForm";
import { ShopProductsPage } from "@/pages/shop/ShopProductsPage";
import { UserPageView } from "@/pages/user-pages/UserPageView";
import { UserPagesPage } from "@/pages/user-pages/UserPagesPage";

export const router = createBrowserRouter([
  {
    element: <PlatformShell />,
    children: [
      { index: true, element: <Navigate to={ACCOUNT_PATH} replace /> },
      // Сервіси — хаб платформи: список екранів, які вже працюють.
      { path: SERVICES_ROUTE, element: <ServicesPage /> },
      { path: FAVORITES_ROUTE, element: <FavoritesPage /> },
      // Трекери — власні щоденні записи людини. Один екран: запис, аналітика й
      // історія живуть модалками, тож окремої адреси в трекера немає.
      { path: TRACKERS_ROUTE, element: <TrackersPage /> },
      // Акаунт — не контент, а дані користувача: платформа й Telegram окремими
      // розділами, а не одним суцільним списком.
      { path: ACCOUNT_ROUTE, element: <ProfileAccountPage /> },
      // Замовлення — у яких магазинах людина працює й куди йти за роботою. Під
      // сторінкою магазину вже стоїть його черга замовлень, тож цей екран лише
      // називає магазини (`ProfileOrdersPage`).
      { path: ORDERS_ROUTE, element: <ProfileOrdersPage /> },
      // Тема — **меню, а не розділ**: палітра в хедері відкриває `ThemeMenu`,
      // де пункти («Кольори теми», «Шрифт теми») розкриваються там же, а
      // редактор теми — модалкою. Адреси тут не потрібно: вибір вигляду не
      // мають ні посилати, ні відкривати в іншому місці.
      // «Розвиток» — самооцінка. Довший шлях проходження іде **перед**
      // розділом: інакше `:key` зʼїсть `assessments` і відкрив би порожній
      // список замість тесту (та сама причина, що в `:id` під сторінками).
      { path: `${ASSESSMENTS_ROUTE}/:key`, element: <AssessmentsScreen /> },
      { path: ASSESSMENTS_ROUTE, element: <AssessmentsScreen /> },
      // Розділу-обгортки немає: «Оголошення», «Ігри» й «Користувачі» —
      // власні екрани з власними адресами, а не вкладки однієї сторінки.
      // Партія йде **перед** списком: інакше `/games` з'їв би хвіст `:key`.
      { path: `${GAMES_ROUTE}/:key`, element: <GamePage /> },
      { path: GAMES_ROUTE, element: <GamesPage /> },
      { path: USERS_ROUTE, element: <UsersPage /> },
      { path: ADS_ROUTE, element: <AdsPage /> },
      // Сторінки людини — теж не рядок контенту, а екран: список власних
      // сторінок, перегляд однієї, її правка й створення. Сам контент сторінки
      // відкривається за її `slug` (catch-all нижче) — і то лише тоді, коли
      // вона публічна. Довший шлях іде першим — та сама причина, що
      // у `/games/:key`; а `new` мусить стояти **перед** `:id`, бо `:id`
      // з'їв би його як номер сторінки, і замість вибору шаблону відкрився б
      // «Такої сторінки немає».
      { path: `${PAGES_ROUTE}/${PAGES_NEW_ROUTE}`, element: <PageCreatePage /> },
      // Товари магазину — **під своєю сторінкою**: `shop_products` належить
      // рядку `scenarios`, тож і адреса стоїть під ним (`/pages/7/products`).
      // `new` мусить стояти перед `:productId` — інакше номер з'їв би його, і
      // замість форми нового товару відкрилось би «такого товару немає».
      {
        path: `${PAGES_ROUTE}/:id/${SHOP_PRODUCTS_ROUTE}/new`,
        element: <ShopProductForm />,
      },
      {
        path: `${PAGES_ROUTE}/:id/${SHOP_PRODUCTS_ROUTE}/:productId`,
        element: <ShopProductForm />,
      },
      { path: `${PAGES_ROUTE}/:id/${SHOP_PRODUCTS_ROUTE}`, element: <ShopProductsPage /> },
      // Замовлення магазину — там само, де товари: `shop_orders` належить тому
      // самому рядку `scenarios`. Сегмент свій, бо це робота з людиною, а не
      // каталог (`pages/shop/ShopOrdersPage`).
      // Одне замовлення — довший шлях стоїть перед списком, інакше `:id`
      // з'їв би номер замовлення як сторінку, і замість правки відкрилась би
      // черга (та сама причина, що в `products/new`).
      {
        path: `${PAGES_ROUTE}/:id/${SHOP_ORDERS_ROUTE}/:orderId`,
        element: <ShopOrderPage />,
      },
      { path: `${PAGES_ROUTE}/:id/${SHOP_ORDERS_ROUTE}`, element: <ShopOrdersPage /> },
      { path: `${PAGES_ROUTE}/:id/${PAGE_EDIT_ROUTE}`, element: <PageEditPage /> },
      { path: `${PAGES_ROUTE}/:id`, element: <UserPageView /> },
      { path: PAGES_ROUTE, element: <UserPagesPage /> },
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
