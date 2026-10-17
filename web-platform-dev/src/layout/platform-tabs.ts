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

/** Непрочитані належать «Акаунту», а число обраного — своєму пункту. */
export const UNREAD_TAB_KEY = "account";
export const FAVORITES_TAB_KEY = "favorites";

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

/**
 * Число на пункті — **один крок для будь-якого числа**: непрочитані лишаються
 * у «Акаунта», обране — у свого пункту, і правило показу в них те саме.
 *
 * Нуль і невалідне число позначки не дають: знак без числа читався б як «щось є».
 */
export function withBadges(
  tabs: readonly TabBarItem[],
  counts: Partial<Record<string, number>>,
): TabBarItem[] {
  return tabs.map((tab) => {
    const value = counts[tab.key];
    if (value === undefined || !Number.isFinite(value) || value <= 0) return tab;
    return { ...tab, badge: Math.trunc(value) };
  });
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
