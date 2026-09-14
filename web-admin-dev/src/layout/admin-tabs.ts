/**
 * Склад пунктів нижнього футера адмінки.
 *
 * Патерн той самий, що в платформи й у топових застосунків: рівні слоти,
 * активний підсвічено колом під іконкою, крайній справа — профіль. Склад —
 * свій: у адмінки інші розділи, і це єдина дозволена різниця між оболонками
 * (AGENTS.md §3).
 *
 * Пункт без `href` — заглушка: екрана під ним ще немає, і дотик чесно про це
 * скаже замість тиші.
 *
 * @module web-admin-dev/src/layout/admin-tabs
 */

import type { ShellTab } from "@wwwuabot/ui/nav";

export const ADMIN_TABS: readonly ShellTab[] = [
  { key: "home", label: "Головна", icon: "home", href: "/" },
  { key: "scenarios", label: "Сценарії", icon: "scenarios", href: "/scenarios" },
  { key: "users", label: "Користувачі", icon: "users", href: "/users" },
  { key: "profile", label: "Профіль", icon: "user" },
];
