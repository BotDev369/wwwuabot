/**
 * Маршрути платформи: карта `key → компонент`, адреса й назва — з реєстру.
 *
 * @module web-platform-dev/src/app/screen-routes
 */

import type { ReactElement } from "react";
import { SCREENS } from "@wwwuabot/shared/screens";
import { AdsPage } from "@/pages/AdsPage";
import { ContactsPage } from "@/pages/ContactsPage";
import { EntryPage } from "@/pages/entry/EntryPage";
import { FavoritesPage } from "@/pages/favorites/FavoritesPage";
import { MessagesPage } from "@/pages/MessagesPage";
import { MyDayPage } from "@/pages/day/MyDayPage";
import { NotesPage } from "@/pages/NotesPage";
import { ProfileAccountPage } from "@/pages/ProfileAccountPage";
import { ProfileOrdersPage } from "@/pages/ProfileOrdersPage";
import { ResearchPage } from "@/pages/research/ResearchPage";
import { ServicesPage } from "@/pages/ServicesPage";
import { TrackersPage } from "@/pages/trackers/TrackersPage";
import { UsersPage } from "@/pages/UsersPage";
import { AnalysisCompare } from "@/pages/analysis/AnalysisCompare";
import { AnalysisHub } from "@/pages/analysis/AnalysisHub";
import { AnalysisMatch } from "@/pages/analysis/AnalysisMatch";
import { AnalysisPeoplePage } from "@/pages/analysis/AnalysisPeoplePage";
import { AnalysisProfile } from "@/pages/analysis/AnalysisProfile";
import { AnalysisQualitiesPage } from "@/pages/analysis/AnalysisQualitiesPage";
import { AnalysisSystemsPage } from "@/pages/analysis/AnalysisSystemsPage";
import { AnalysisTestScreen } from "@/pages/analysis/AnalysisTestScreen";
import { AnalysisTestsPage } from "@/pages/analysis/AnalysisTestsPage";
import { AnalysisVariantsPage } from "@/pages/analysis/AnalysisVariantsPage";
import { SubjectStep } from "@/pages/analysis/SubjectStep";
import { SystemsStep } from "@/pages/analysis/SystemsStep";
import { GamePage } from "@/pages/games/GamePage";
import { GamesPage } from "@/pages/games/GamesPage";
import { ShopOrderPage } from "@/pages/shop/ShopOrderPage";
import { ShopOrdersPage } from "@/pages/shop/ShopOrdersPage";
import { ShopProductForm } from "@/pages/shop/ShopProductForm";
import { ShopProductsPage } from "@/pages/shop/ShopProductsPage";
import { ShopsPage } from "@/pages/shop/ShopsPage";

/** Компонент екрана за ключем реєстру. */
const COMPONENTS: Record<string, () => ReactElement> = {
  day: () => <MyDayPage />,
  services: () => <ServicesPage />,
  favorites: () => <FavoritesPage />,
  trackers: () => <TrackersPage />,
  account: () => <ProfileAccountPage />,
  shops: () => <ShopsPage />,
  orders: () => <ProfileOrdersPage />,
  messages: () => <MessagesPage />,
  notes: () => <NotesPage />,
  contacts: () => <ContactsPage />,
  research: () => <ResearchPage />,
  ads: () => <AdsPage />,
  games: () => <GamesPage />,
  "games.play": () => <GamePage />,
  users: () => <UsersPage />,
  analysis: () => <AnalysisHub />,
  "analysis.hub.1": () => <AnalysisHub variant={1} />,
  "analysis.hub.2": () => <AnalysisHub variant={2} />,
  "analysis.hub.3": () => <AnalysisHub variant={3} />,
  "analysis.variants": () => <AnalysisVariantsPage />,
  "analysis.systems": () => <AnalysisSystemsPage />,
  "analysis.tests": () => <AnalysisTestsPage />,
  "analysis.test": () => <AnalysisTestScreen />,
  "analysis.qualities": () => <AnalysisQualitiesPage />,
  "analysis.people": () => <AnalysisPeoplePage />,
  "analysis.match": () => <AnalysisMatch />,
  "analysis.person": () => <SubjectStep mode="person" />,
  "analysis.person.systems": () => <SystemsStep mode="person" />,
  "analysis.person.result": () => <AnalysisProfile mode="person" />,
  "analysis.event": () => <SubjectStep mode="event" />,
  "analysis.event.systems": () => <SystemsStep mode="event" />,
  "analysis.event.result": () => <AnalysisProfile mode="event" />,
  "analysis.compare": () => <SubjectStep mode="compare" />,
  "analysis.compare.systems": () => <SystemsStep mode="compare" />,
  "analysis.compare.result": () => <AnalysisCompare />,
  "scenarios.products": () => <ShopProductsPage />,
  "scenarios.product.new": () => <ShopProductForm />,
  "scenarios.product": () => <ShopProductForm />,
  "scenarios.orders": () => <ShopOrdersPage />,
  "scenarios.order": () => <ShopOrderPage />,
};

/** Один маршрут React Router: шлях без верхнього слеша, як вимагає вкладений список. */
export interface ScreenRoute {
  key: string;
  path: string;
  element: ReactElement;
}

/** Усі маршрути реєстру, для яких є компонент. */
export const SCREEN_ROUTES: readonly ScreenRoute[] = SCREENS.flatMap((screen) => {
  const component = COMPONENTS[screen.key];
  if (!component || !screen.path || screen.path === "/") return [];
  return [{ key: screen.key, path: screen.path.replace(/^\//, ""), element: component() }];
});

/** Головна сторінка продукту — вітрина входу, а не рядок реєстру зі своєю адресою. */
export const ENTRY_ELEMENT: ReactElement = <EntryPage />;

/** Ключі, для яких карта має компонент: їх звіряє тест із реєстром. */
export const COMPONENT_KEYS: readonly string[] = Object.keys(COMPONENTS);
