import { toWebPath } from "@wwwuabot/shared/content";
import type { ShellTab, TabBarItem } from "@wwwuabot/ui/nav";
import {
  CONTACTS_PATH,
  CREATE_PATH,
  FAVORITES_PATH,
  MESSAGES_PATH,
  NOTES_PATH,
  PAGES_PATH,
  PROFILE_PATH,
  SPACE_PATH,
} from "../app/routes";

export interface PlatformTab extends Omit<ShellTab, "href"> {
  slug?: string;
  to?: string;
}

/** Повідомлення належать I, тож його слот несе число непрочитаних. */
export const MESSAGES_TAB_KEY = "profile";

export const PLATFORM_TABS: readonly PlatformTab[] = [
  { key: "profile", label: "I", icon: "user", iconActive: "user-solid", to: PROFILE_PATH },
  { key: "favorites", label: "Обране", icon: "thumbs-up", to: FAVORITES_PATH },
  { key: "space", label: "You", icon: "users", iconActive: "users-solid", to: SPACE_PATH },
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
  const own = [
    "/",
    PROFILE_PATH,
    CREATE_PATH,
    MESSAGES_PATH,
    NOTES_PATH,
    CONTACTS_PATH,
    PAGES_PATH,
    "/mydate",
  ];
  if (own.some((path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)))) {
    return PROFILE_PATH;
  }
  return SPACE_PATH;
}
