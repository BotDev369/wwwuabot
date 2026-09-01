export interface NavItem {
  to: string;
  label: string;
  icon: string;
}

export interface NavSection {
  /** Заголовок секції. null = пункти без групи (верхній блок). */
  title: string | null;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: null,
    items: [{ to: "/", label: "Головна", icon: "🏠" }],
  },
  {
    title: "Сценарії",
    items: [
      { to: "/scenarios", label: "Сценарії — портал", icon: "📋" },
      { to: "/scenarios-admin", label: "Сценарії — адмін", icon: "⚙️" },
    ],
  },
  {
    title: "Адміністрування",
    items: [{ to: "/users", label: "Користувачі", icon: "👥" }],
  },
];
