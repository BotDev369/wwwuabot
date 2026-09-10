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
    items: [
      { to: "/scenarios", label: "Сценарії", icon: "scenarios" },
    ],
  },
  {
    title: "Сайти",
    items: [
      { to: "/sites", label: "Всі сайти", icon: "layout" },
      { to: "/sites/moderation", label: "Модерація", icon: "eye" },
      { to: "/templates", label: "Шаблони", icon: "layers" },
    ],
  },
  {
    title: "Адміністрування",
    items: [
      { to: "/users", label: "Користувачі", icon: "users" },
      { to: "/bot-settings", label: "Налаштування бота", icon: "settings" },
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
