import { DATE_ANALYSIS_PATH, toWebPath } from "@wwwuabot/shared/content";
import type { ShellTab, TabBarItem } from "@wwwuabot/ui/nav";
import {
  ACCOUNT_PATH,
  CONTACTS_PATH,
  FAVORITES_PATH,
  MESSAGES_PATH,
  NOTES_PATH,
  ORDERS_PATH,
  PAGES_PATH,
  SERVICES_PATH,
} from "../app/routes";

export interface PlatformTab extends Omit<ShellTab, "href"> {
  slug?: string;
  to?: string;
}

/** Непрочитані належать «Акаунту», тож число несе саме його слот. */
export const UNREAD_TAB_KEY = "account";

/**
 * Три пункти смуги — **самі знаки**: підписів під іконками немає, а `label`
 * лишається лише назвою для скрінрідера (`aria-label`).
 *
 * «Я» веде на **акаунт**: за знаком людини стоїть людина, а список екранів —
 * «Сервіси».
 */
export const PLATFORM_TABS: readonly PlatformTab[] = [
  {
    key: "account",
    label: "Акаунт",
    icon: "user",
    iconActive: "user-solid",
    to: ACCOUNT_PATH,
  },
  { key: "favorites", label: "Обране", icon: "thumbs-up", to: FAVORITES_PATH },
  { key: "services", label: "Сервіси", icon: "grid", to: SERVICES_PATH },
];

export function withUnreadBadge(tabs: readonly TabBarItem[], unread: number): TabBarItem[] {
  if (!Number.isFinite(unread) || unread <= 0) return [...tabs];
  return tabs.map((tab) => (tab.key === UNREAD_TAB_KEY ? { ...tab, badge: unread } : tab));
}

export function toShellTabs(tabs: readonly PlatformTab[] = PLATFORM_TABS): ShellTab[] {
  return tabs.map(({ slug, to, ...tab }) => ({
    ...tab,
    href: to ?? (slug === undefined ? undefined : toWebPath(slug)),
  }));
}

/** Своє належить «Акаунту»; сторінка контенту за `slug` — жодному пункту. */
export function platformSectionPath(pathname: string): string {
  if (pathname === FAVORITES_PATH || pathname.startsWith(`${FAVORITES_PATH}/`))
    return FAVORITES_PATH;
  if (pathname === SERVICES_PATH || pathname.startsWith(`${SERVICES_PATH}/`)) return SERVICES_PATH;
  const own = [
    "/",
    ACCOUNT_PATH,
    ORDERS_PATH,
    MESSAGES_PATH,
    NOTES_PATH,
    CONTACTS_PATH,
    PAGES_PATH,
    DATE_ANALYSIS_PATH,
  ];
  if (own.some((path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)))) {
    // Саме адреса пункту: пункт «Я» веде на акаунт, тож підсвітити його може
    // лише та адреса — разом з екранами, які людиною й зайняті.
    return ACCOUNT_PATH;
  }
  // Сторінка контенту за `slug` не належить жодному пункту — і не мусить його
  // підсвічувати: з трьох пунктів жоден не є «читати чуже».
  return pathname;
}
