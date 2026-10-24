/**
 * Ключ екрана з адреси — те, що оболонка каже журналу («відкрив Трекери»).
 * Адреси знає тільки застосунок; невідомий шлях — це `page` (сторінка
 * контенту), бо саме відкриту сторінку й показує журнал.
 *
 * @module web-platform-dev/src/app/screens
 */

import { DATE_ANALYSIS_PATH } from "@wwwuabot/shared/content";
import {
  ACCOUNT_PATH,
  ADS_PATH,
  ASSESSMENTS_PATH,
  CONTACTS_PATH,
  FAVORITES_PATH,
  GAMES_PATH,
  MESSAGES_PATH,
  NOTES_PATH,
  ORDERS_PATH,
  PAGES_PATH,
  SERVICES_PATH,
  TRACKERS_PATH,
  USERS_PATH,
} from "./routes";

/** Екран, до якого належить адреса; невідоме — сторінка контенту. */
export function screenKeyOfPath(pathname: string): string {
  const path = pathname.replace(/\/+$/, "") || "/";
  const at = (base: string): boolean => path === base || path.startsWith(`${base}/`);

  if (at("/trackers")) {
    // `/trackers/:id` — окремий екран (картка трекера), а не список.
    return path === TRACKERS_PATH ? "trackers" : "tracker";
  }
  if (at(FAVORITES_PATH)) return "favorites";
  if (at(MESSAGES_PATH)) return "messages";
  if (at(NOTES_PATH)) return "notes";
  if (at(CONTACTS_PATH)) return "contacts";
  if (at(ORDERS_PATH)) return "orders";
  if (at(PAGES_PATH)) return "pages";
  if (at(ADS_PATH)) return "ads";
  if (at(USERS_PATH)) return "users";
  if (at(GAMES_PATH)) return "games";
  if (at(ASSESSMENTS_PATH)) return "assessments";
  if (at(SERVICES_PATH)) return "services";
  if (at(ACCOUNT_PATH) || path === "/") return "account";
  if (at(DATE_ANALYSIS_PATH)) return "date-analysis";
  return "page";
}
