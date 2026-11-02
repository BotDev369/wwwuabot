/**
 * Ключі шаблонів сторінок, які будує **код платформи**, а не людина: полів у
 * них немає, у переліку створення вони не з'являються. Потрібні, щоб
 * `scenarios.template_key` ніколи не був порожнім — правило й рішення для нової
 * сторінки: `docs/PAGES.md` §7.
 *
 * @module @wwwuabot/shared/pages
 */

/** Сторінка платформи: шаблон є, полів для заповнення немає. */
export interface PlatformPageTemplate {
  key: string;
  /** Підпис для звітів та адмінки. */
  label: string;
  /** Один рядок: чим ця сторінка відрізняється від шаблону людини. */
  hint: string;
  /** Хто будує каркас: шлях, який мусить існувати в репозиторії. */
  owner: string;
}

export const PLATFORM_PAGE_TEMPLATES: readonly PlatformPageTemplate[] = [
  {
    key: "research",
    label: "Дослідження",
    hint: "Обкладинка дослідження: збирається з markdown-блоків, тексту для редагування немає",
    owner: "scripts/research/build-pages.mjs",
  },
  {
    key: "screen",
    label: "Екран",
    hint: "Сторінка-механіка: один блок у каркасі, адреса й параметри приходять із собою",
    owner: "packages/ui/src/blocks",
  },
];

export const PLATFORM_PAGE_KEYS: readonly string[] = PLATFORM_PAGE_TEMPLATES.map(
  (template) => template.key,
);

/** Ключ належить сторінці платформи (а не людині, яка створює сторінку). */
export function isPlatformPageKey(value: unknown): boolean {
  return typeof value === "string" && PLATFORM_PAGE_KEYS.includes(value);
}
