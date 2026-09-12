/**
 * Чисті хелпери редактора сайту: без стану, без мережі, без React.
 *
 * @module web-platform-dev/src/pages/site-editor
 */

import type { Site } from "@wwwuabot/shared/types/site";
import type { SiteSettingsForm } from "./types";

export const EMPTY_SETTINGS: SiteSettingsForm = {
  title: "",
  description: "",
  theme: "auto",
  logo: "",
  primaryColor: "",
  isPublic: false,
};

/** «Моя нова сторінка» → «moya-nova-storinka» (кирилиця лишається кирилицею). */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/[\s_]+/gu, "-")
    .replace(/-+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 64);
}

/**
 * Форма налаштувань із завантаженого сайту.
 *
 * Саме функція, а не `useEffect` із `setState`: форма — це похідна від сайту
 * плюс правки користувача, тож її обчислюють під час рендера (див.
 * `useSiteEditor`), а не синхронізують ефектом.
 */
export function toSettingsForm(site: Site | null): SiteSettingsForm {
  if (!site) return EMPTY_SETTINGS;
  return {
    title: site.title ?? "",
    description: site.description ?? "",
    theme: site.settings?.theme ?? "auto",
    logo: site.settings?.logo ?? "",
    primaryColor: site.settings?.primaryColor ?? "",
    isPublic: Boolean(site.isPublic),
  };
}

export const errorMessage = (e: unknown, fallback: string) =>
  e instanceof Error ? e.message : fallback;
