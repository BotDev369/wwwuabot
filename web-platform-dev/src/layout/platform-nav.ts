/**
 * Навігація платформи: **головні пункти + «Ще»**.
 *
 * П'яти слотів більше немає — і це не косметика. Футер мав рівно п'ять місць,
 * тож кожна нова річ штовхалася в «Сервіси» або не потрапляла нікуди. Тепер
 * у сайдбарі два рівні: те, чим людина живе щодня, і «Ще» — решта, одним
 * списком. Список росте, головне меню — ні.
 *
 * **Пункт — це адреса.** Ні `onSelect`, ні заглушок: усе, що стоїть у меню,
 * уже має екран. Екран, якого ще немає, не робить вигляд, що натискається.
 * Тому «Світлиці» тут поки немає: її екран має прийти з макета, а не вести на
 * чужі оцінки. Пункт повертається тоді, коли з'явиться сам екран.
 *
 * **«Тут ти» — один пункт.** Підсвічує себе найдовша адреса, що збігається, тож
 * `/pages/7` світить «Базар», а `/account` — «Я», а не обидва.
 *
 * @module web-platform-dev/src/layout/platform-nav
 */

import type { SideBarItem, SideBarSection } from "@wwwuabot/ui/nav";
import {
  ACCOUNT_PATH,
  CONTACTS_PATH,
  FAVORITES_PATH,
  MESSAGES_PATH,
  NOTES_PATH,
  ORDERS_PATH,
  PAGES_PATH,
  SERVICES_PATH,
  TRACKERS_PATH,
  USERS_PATH,
} from "../app/routes";

/** Головне меню: щоденна робота людини, у порядку ранку. */
const MAIN: readonly SideBarItem[] = [
  { key: "day", label: "Мій день", icon: "home", href: "/" },
  { key: "bazar", label: "Базар", icon: "cart", href: PAGES_PATH },
  { key: "hurt", label: "Гурт", icon: "users", href: USERS_PATH },
  { key: "me", label: "Я", icon: "user", href: ACCOUNT_PATH },
];

/** «Ще»: усе інше одним списком. */
const MORE: readonly SideBarItem[] = [
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
 * Рахуємо **найдовший** збіг: інакше `/pages/7` світило б і «Базар», і «Мій
 * день», і екран мав би два «тут ти».
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
