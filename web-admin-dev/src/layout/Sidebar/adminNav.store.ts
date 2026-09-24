/**
 * Admin sidebar navigation — конфігурований Zustand store.
 *
 * Замінює захардкоджений navItems.ts: пункти меню зберігаються
 * в стані store і можуть бути оновлені в runtime (наприклад,
 * з API або налаштувань адміна). Дефолтні значення відповідають
 * попередньому хардкоду.
 *
 * @module web-admin-dev/src/layout/Sidebar/adminNav.store
 */

import { create } from "zustand";
import type { IconName } from "@wwwuabot/shared";

// ── Types ────────────────────────────────────────────────────────

export interface AdminNavItem {
  /** Маршрут (react-router path). */
  to: string;
  /** Людська назва пункту. */
  label: string;
  /** Ключ SVG-іконки з реєстру @wwwuabot/shared. */
  icon: IconName;
}

export interface AdminNavSection {
  /** Заголовок секції. null = пункти без групи (верхній блок). */
  title: string | null;
  items: AdminNavItem[];
}

interface AdminNavState {
  /** Поточна конфігурація секцій навігації. */
  sections: AdminNavSection[];
  /** Оновити весь список секцій. */
  setSections: (sections: AdminNavSection[]) => void;
  /** Додати пункт до існуючої секції (за індексом або назвою). */
  addItem: (sectionIndex: number, item: AdminNavItem) => void;
  /** Видалити пункт за route path. */
  removeItem: (to: string) => void;
}

// ── Default config (from legacy navItems.ts) ─────────────────────

const DEFAULT_SECTIONS: AdminNavSection[] = [
  {
    title: null,
    items: [{ to: "/", label: "Головна", icon: "home" }],
  },
  {
    title: "Сценарії",
    items: [{ to: "/scenarios", label: "Сценарії", icon: "scenarios" }],
  },
  {
    title: "Адміністрування",
    items: [
      { to: "/users", label: "Користувачі", icon: "users" },
      // Моніторинг — до налаштувань: зріз показує, у якому стані проєкт
      // (код, репозиторій), і це найчастіший привід відкрити панель без
      // конкретної задачі.
      { to: "/monitoring", label: "Моніторинг", icon: "bar-chart" },
      { to: "/bot-settings", label: "Налаштування бота", icon: "settings" },
      // Профіль — на мобільному в нижньому футері, на десктопі в меню: футер
      // існує лише на мобільному, а екран мусить бути досяжним всюди.
      { to: "/profile", label: "Профіль", icon: "user" },
    ],
  },
];

// ── Store ────────────────────────────────────────────────────────

export const useAdminNav = create<AdminNavState>((set) => ({
  sections: DEFAULT_SECTIONS,

  setSections: (sections) => set({ sections }),

  addItem: (sectionIndex, item) =>
    set((state) => {
      const sections = [...state.sections];
      const section = { ...sections[sectionIndex] };
      section.items = [...section.items, item];
      sections[sectionIndex] = section;
      return { sections };
    }),

  removeItem: (to) =>
    set((state) => ({
      sections: state.sections.map((section) => ({
        ...section,
        items: section.items.filter((item) => item.to !== to),
      })),
    })),
}));
