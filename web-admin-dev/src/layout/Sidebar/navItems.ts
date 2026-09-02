import type { IconName } from "@wwwuabot/shared";

export interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

export interface NavSection {
  /** Заголовок секції. null = пункти без групи (верхній блок). */
  title: string | null;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: null,
    items: [{ to: "/", label: "Головна", icon: "home" }],
  },
  {
    title: "Сценарії",
    items: [
      { to: "/scenarios", label: "Сценарії — портал", icon: "scenarios" },
      { to: "/scenarios-admin", label: "Сценарії — адмін", icon: "scenarios-admin" },
    ],
  },
  {
    title: "Адміністрування",
    items: [
      { to: "/users", label: "Користувачі", icon: "users" },
      { to: "/bot-settings", label: "Налаштування бота", icon: "bot" },
    ],
  },
];
