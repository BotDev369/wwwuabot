/**
 * web app store — re-export shared store.
 * Зберігаємо зворотну сумісність з імпортами `@/stores/app.store`.
 */

export { useAppStore } from "@wwwuabot/shared";
export type { AppState } from "@wwwuabot/shared";
