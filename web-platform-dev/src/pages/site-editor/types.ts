/**
 * Типи редактора сайту.
 *
 * @module web-platform-dev/src/pages/site-editor
 */

import type { NavigationItem, Site, SitePage } from "@wwwuabot/shared/types/site";

export type SiteEditorTab = "pages" | "navigation" | "settings" | "preview";

/** Поля вкладки «Налаштування» — рівно те, що летить у `PUT /api/sites/:slug`. */
export interface SiteSettingsForm {
  title: string;
  description: string;
  theme: "light" | "dark" | "auto";
  logo: string;
  primaryColor: string;
  isPublic: boolean;
}

/** Те, що повертає `useSiteEditor` — контракт для всіх вкладок. */
export interface SiteEditorApi {
  site: Site | null;
  pages: SitePage[];
  loading: boolean;
  error: string | null;
  saving: boolean;

  activeTab: SiteEditorTab;
  setActiveTab: (tab: SiteEditorTab) => void;

  editingPageSlug: string | null;
  selectPage: (slug: string | null) => void;

  settings: SiteSettingsForm;
  updateSettings: (patch: Partial<SiteSettingsForm>) => void;

  navItems: NavigationItem[];

  addPage: () => Promise<void>;
  deletePage: (page: SitePage) => Promise<void>;
  saveSettings: () => Promise<void>;
  addNavItem: () => Promise<void>;
  /** Видаляє пункт за адресою сторінки: індекс залежить від порядку показу. */
  removeNavItem: (pageSlug: string) => void;
  publish: () => Promise<void>;
  reloadPages: () => Promise<void>;
}
