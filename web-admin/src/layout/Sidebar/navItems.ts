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
      { to: "/editor", label: "Редактор", icon: "✏️" },
      { to: "/scenarios", label: "Сценарії", icon: "📋" },
      { to: "/scenarios-v2", label: "Сценарії v.2", icon: "📋" },
    ],
  },
  {
    title: "Адміністрування",
    items: [{ to: "/users", label: "Користувачі", icon: "👥" }],
  },
];
