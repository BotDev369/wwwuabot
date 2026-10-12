import { DATE_ANALYSIS_PATH, toWebPath } from "@wwwuabot/shared/content";
import type { ShellTab, TabBarItem } from "@wwwuabot/ui/nav";
import {
  CONTACTS_PATH,
  CREATE_PATH,
  FAVORITES_PATH,
  MESSAGES_PATH,
  NOTES_PATH,
  PAGES_PATH,
  PROFILE_ACCOUNT_PATH,
  PROFILE_PATH,
  SERVICES_PATH,
} from "../app/routes";

export interface PlatformTab extends Omit<ShellTab, "href"> {
  slug?: string;
  to?: string;
}

/** Повідомлення належать I, тож його слот несе число непрочитаних. */
export const MESSAGES_TAB_KEY = "profile";

/**
 * Три пункти смуги — **самі знаки**: підписів під іконками немає, а `label`
 * лишається лише назвою для скрінрідера (`aria-label`).
 *
 * «Я» веде на **акаунт**, а не на хаб: за знаком людини стоїть людина, а
 * хаб — це список, який тепер показує «Сервіси».
 */
export const PLATFORM_TABS: readonly PlatformTab[] = [
  {
    key: "profile",
    label: "Акаунт",
    icon: "user",
    iconActive: "user-solid",
    to: PROFILE_ACCOUNT_PATH,
  },
  { key: "favorites", label: "Обране", icon: "thumbs-up", to: FAVORITES_PATH },
  { key: "services", label: "Сервіси", icon: "grid", to: SERVICES_PATH },
];

export function withUnreadBadge(tabs: readonly TabBarItem[], unread: number): TabBarItem[] {
  if (!Number.isFinite(unread) || unread <= 0) return [...tabs];
  return tabs.map((tab) => (tab.key === MESSAGES_TAB_KEY ? { ...tab, badge: unread } : tab));
}

export function toShellTabs(tabs: readonly PlatformTab[] = PLATFORM_TABS): ShellTab[] {
  return tabs.map(({ slug, to, ...tab }) => ({
    ...tab,
    href: to ?? (slug === undefined ? undefined : toWebPath(slug)),
  }));
}

/** Власні інструменти належать I; публічний контент за slug — You. */
export function platformSectionPath(pathname: string): string {
  if (pathname === FAVORITES_PATH || pathname.startsWith(`${FAVORITES_PATH}/`))
    return FAVORITES_PATH;
  if (pathname === SERVICES_PATH || pathname.startsWith(`${SERVICES_PATH}/`))
    return SERVICES_PATH;
  const own = [
    "/",
    PROFILE_PATH,
    CREATE_PATH,
    MESSAGES_PATH,
    NOTES_PATH,
    CONTACTS_PATH,
    PAGES_PATH,
    DATE_ANALYSIS_PATH,
  ];
  if (own.some((path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)))) {
    // Саме адреса пункту, а не хабу: пункт «Я» веде на акаунт, тож підсвітити
    // його може лише та адреса.
    return PROFILE_ACCOUNT_PATH;
  }
  // Сторінка контенту за `slug` не належить жодному пункту — і не мусить його
  // підсвічувати: з трьох пунктів жоден не є «читати чуже».
  return pathname;
}
