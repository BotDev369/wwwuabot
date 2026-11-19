/**
 * Навігація платформи: головні пункти + «Ще». Пункт — це адреса: усе, що
 * стоїть у меню, уже має екран, і екран, якого немає, не робить вигляд, що
 * натискається. «Тут ти» — найдовша адреса, що збігається, тож `/account`
 * світить лише «Я», а вкладки магазину (`/scenarios/7/products`) — нічого: вони
 * не пункт меню, а сторінка всередині магазину.
 *
 * **Магазини, аналіз і тестування стоять у меню навмисно.** Це три речі, заради
 * яких людина приходить: без пункту вони існували тільки для того, кому колись
 * надіслали посилання.
 *
 * @module web-platform-dev/src/layout/platform-nav
 */

import type { SideBarItem, SideBarSection } from "@wwwuabot/ui/nav";
import { DATE_ANALYSIS_PATH } from "@wwwuabot/shared/content";
import {
  ACCOUNT_PATH,
  ASSESSMENTS_PATH,
  CONTACTS_PATH,
  DAY_PATH,
  FAVORITES_PATH,
  MESSAGES_PATH,
  NOTES_PATH,
  ORDERS_PATH,
  SERVICES_PATH,
  SHOPS_PATH,
  TRACKERS_PATH,
  USERS_PATH,
} from "../app/routes";

/** Головне меню: щоденна робота людини, у порядку ранку. */
const MAIN: readonly SideBarItem[] = [
  { key: "day", label: "Мій день", icon: "home", href: DAY_PATH },
  { key: "hurt", label: "Гурт", icon: "users", href: USERS_PATH },
  { key: "me", label: "Я", icon: "user-solid", href: ACCOUNT_PATH },
];

/** «Ще»: усе інше одним списком. */
const MORE: readonly SideBarItem[] = [
  { key: "shops", label: "Магазини", icon: "cart", href: SHOPS_PATH },
  { key: "analysis", label: "Аналіз людей", icon: "my-dates", href: DATE_ANALYSIS_PATH },
  { key: "assessments", label: "Тестування", icon: "growth", href: ASSESSMENTS_PATH },
  { key: "favorites", label: "Обране", icon: "thumbs-up", href: FAVORITES_PATH },
  { key: "trackers", label: "Трекери", icon: "bar-chart", href: TRACKERS_PATH },
  { key: "notes", label: "Нотатки", icon: "list", href: NOTES_PATH },
  { key: "contacts", label: "Контакти", icon: "contact", href: CONTACTS_PATH },
  { key: "messages", label: "Повідомлення", icon: "message-square", href: MESSAGES_PATH },
  { key: "orders", label: "Замовлення", icon: "clipboard", href: ORDERS_PATH },
  { key: "services", label: "Послуги", icon: "layers", href: SERVICES_PATH },
];

/** Секції меню: головні без підпису, решта — під «Ще». */
export const PLATFORM_NAV: readonly SideBarSection[] = [
  { key: "main", items: MAIN },
  { key: "more", title: "Ще", items: MORE },
];

/** Адреса без хвостового слеша: `/pages/` і `/pages` — та сама сторінка. */
function normalize(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}

/** Чи адреса належить пунктові: або він сам, або глибше за нього. */
function belongs(pathname: string, href: string | undefined): boolean {
  if (href === undefined) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Меню з підсвіченим пунктом.
 *
 * Рахуємо **найдовший** збіг: інакше `/scenarios/7/products` світило б і
 * «Магазини», і «Мій день», і екран мав би два «тут ти».
 */
export function platformNav(pathname: string): SideBarSection[] {
  const path = normalize(pathname);
  const all = PLATFORM_NAV.flatMap((section) => section.items);
  const winner = all
    .filter((item) => belongs(path, item.href))
    .sort((a, b) => (b.href?.length ?? 0) - (a.href?.length ?? 0))[0];

  return PLATFORM_NAV.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item, active: item.key === winner?.key })),
  }));
}
