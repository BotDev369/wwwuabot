/**
 * Подання сторінки — чисті функції, яких не видно з даних.
 *
 * Тут живуть рівно три речі, які мусять звучати однаково на всіх екранах:
 * **слово видимості** («Публічно» / «Приватно»), **підпис рядка** й **підпис
 * автора**. Розійтись вони могли б непомітно: два рядки списку в різних
 * вкладках — це вже два правила одного факту (`AGENTS.md` §7). Тому тексти тут,
 * а розмітка — у компонентах; саме тому це й тестується без DOM.
 *
 * @module web-platform-dev/src/pages/user-pages
 */

import { formatPlatformUsername, type IconName } from "@wwwuabot/shared";
import type { PageTemplateKey, PublicPage, UserPage } from "@wwwuabot/shared/pages";

/** Іконка шаблону: ім'я з реєстру, приведене до `IconName` (як у блоках). */
const PAGE_TEMPLATE_ICONS: Record<PageTemplateKey, IconName> = {
  card: "card",
  event: "calendar",
};

export function pageTemplateIcon(key: PageTemplateKey): IconName {
  return PAGE_TEMPLATE_ICONS[key] ?? "layout";
}

/** Одне слово про видимість — те, яке людина читає в списку й на сторінці. */
export function visibilityLabel(isPublic: boolean): string {
  return isPublic ? "Публічно" : "Приватно";
}

/** Адреса сторінки так, як її читають: зі слешем, без домену. */
export function pageAddressLabel(page: Pick<UserPage, "slug"> | Pick<PublicPage, "slug">): string {
  return `/${page.slug}`;
}

/** Другий рядок у списку: видимість і адреса — те, чого не видно з назви. */
export function pageHint(page: Pick<UserPage, "isPublic" | "slug">): string {
  return `${visibilityLabel(page.isPublic)} · ${pageAddressLabel(page)}`;
}

/**
 * Підпис автора в Просторі.
 *
 * Ім'я на платформі — з `#`, ніколи з `@`: `@` належить Telegram
 * (`AGENTS.md` §2). Немає імені — «Без імені», а не порожнє місце: порожній
 * рядок читався б як поламана картка.
 */
export function publicPageAuthor(page: Pick<PublicPage, "author">): string {
  return formatPlatformUsername(page.author.name) ?? "Без імені";
}
