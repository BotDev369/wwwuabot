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
import type { PageStaff, PageTemplateKey, PublicPage, UserPage } from "@wwwuabot/shared/pages";

/** Іконка шаблону: ім'я з реєстру, приведене до `IconName` (як у блоках). */
const PAGE_TEMPLATE_ICONS: Record<PageTemplateKey, IconName> = {
  card: "card",
  event: "calendar",
  shop: "shop",
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

/**
 * Номер сторінки з адреси (`/pages/7`, `/pages/7/edit`): ціле, більше за нуль.
 *
 * Усе інше — `null`, і це не дрібниця: сміття в адресі (`/pages/abc`) — не
 * «нуль», а **відсутність** сторінки, тож запит із таким номером пішов би в
 * нікуди й повернув чужу помилку.
 */
export function parseUserPageId(id: string | undefined): number | null {
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
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

/**
 * Хто веде сторінку — одним рядком для картки «Доступ».
 *
 * Імена вже складені сервером (`peerLabel`): клієнт їх не вигадує, бо імені
 * людини в продукті один переклад. Людини без рядка `users` називають **номером**,
 * а не порожнім місцем: доступ роздають саме за номером.
 */
export function staffLabel(page: Pick<UserPage, "staff">): string {
  const owner = page.staff.find((member) => member.role === "owner");
  const admins = page.staff.filter((member) => member.role === "admin");
  const parts = [`Власник: ${staffMemberLabel(owner)}`];
  if (admins.length > 0) parts.push(`Адміни: ${admins.map(staffMemberLabel).join(", ")}`);
  return parts.join(" · ");
}

/**
 * Що людина тут може — другим рядком картки.
 *
 * Склад адмінів міняє **тільки власник** (`docs/SHOPS.md` §8): адмін веде
 * магазин, але доступ не роздає — і ряду «Додати адміна» в нього немає.
 */
export function accessHint(page: Pick<UserPage, "role">): string {
  return page.role === "owner"
    ? "Ви власник — адмінів додаєте ви."
    : "Ви адміністратор: доступом керує власник.";
}

/**
 * Підпис одного з тих, хто веде сторінку.
 *
 * Немає імені — номер: людину додають саме номером, і кнопка «Прибрати:»
 * мусить називати те саме, що вписували.
 */
export function staffMemberLabel(member: PageStaff | undefined): string {
  if (!member) return "невідомо";
  return member.name ?? `ID ${member.id}`;
}
