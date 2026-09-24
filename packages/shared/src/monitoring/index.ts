/**
 * Моніторинг проєкту: спільні типи, реєстр показників і чисті перетворення.
 *
 * Збирає зріз `api-dev` (він єдиний має вихід у GitHub — AGENTS.md §3),
 * показує `web-admin-dev`. Обидва беруть форму зрізу звідси, тож розійтись
 * вони не можуть.
 *
 * @module @wwwuabot/shared/monitoring
 */

export * from "./types";
export * from "./metrics";
export * from "./snapshot";
