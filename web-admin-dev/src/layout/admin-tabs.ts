/**
 * Склад пунктів нижнього футера адмінки.
 *
 * Патерн той самий, що в платформи й у топових застосунків: рівні слоти,
 * у центрі — «+», крайній справа — профіль, а вибраний розділ показує залитий
 * варіант своєї іконки. Склад — свій: у адмінки інші розділи, і це єдина
 * дозволена різниця між оболонками (AGENTS.md §3).
 *
 * Пункт без `href` — заглушка: екрана під ним ще немає, і дотик чесно про це
 * скаже замість тиші.
 *
 * @module web-admin-dev/src/layout/admin-tabs
 */

import type { ShellTab } from "@wwwuabot/ui/nav";

export const ADMIN_TABS: readonly ShellTab[] = [
  { key: "home", label: "Головна", icon: "home", iconActive: "home-solid", href: "/" },
  {
    key: "scenarios",
    label: "Сценарії",
    icon: "scenarios",
    iconActive: "scenarios-solid",
    href: "/scenarios",
  },
  { key: "create", label: "Створити", icon: "plus", primary: true },
  {
    key: "users",
    label: "Користувачі",
    icon: "users",
    iconActive: "users-solid",
    href: "/users",
  },
  { key: "profile", label: "Профіль", icon: "user", iconActive: "user-solid" },
];
