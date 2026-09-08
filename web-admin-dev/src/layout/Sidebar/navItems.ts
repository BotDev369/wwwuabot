/**
 * @deprecated Use `useAdminNav` from `./adminNav.store` instead.
 *
 * This file is kept for backward compatibility. The actual nav config
 * is now managed by the `useAdminNav` Zustand store.
 */

export { useAdminNav as useNavSections } from "./adminNav.store";
export type { AdminNavItem as NavItem, AdminNavSection as NavSection } from "./adminNav.store";
