/**
 * Що показують дві облікові картки меню профілю — чисті функції.
 *
 * Логіка тут, а не в компоненті: рядок картки — це не розмітка, а **правило**
 * («звідки береться ім'я», «що робити, коли хендла немає»), і його треба
 * перевіряти без DOM. Компонент (`ProfileAccountCards`) лише рендерить те,
 * що повернули ці функції.
 *
 * **Telegram і платформа не змішуються.** Раніше картка показувала
 * `platformUsername ?? username` одним рядком — тобто підпис «@karas» міг
 * означати і власне ім'я людини на wwwuabot, і Telegram-хендл, як завгодно
 * (AGENTS.md §2). Тепер кожне з двох полів живе на своїй картці: у Telegram
 * `username` може зникнути, ім'я на платформі — наше й лишається назавжди.
 *
 * @module web-platform-dev/src/layout/profile-account
 */

import type { UserProfileData } from "@wwwuabot/shared";
import { formatDay } from "@wwwuabot/shared/utils/datetime";

/** Ім'я з Telegram: те, що людина бачить у самому Telegram. */
export function telegramName(user: UserProfileData | null): string | null {
  const full = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim();
  return full || null;
}

/** Telegram-хендл — дані Telegram, які ми не обираємо й не можемо повернути. */
export function telegramHandle(user: UserProfileData | null): string | null {
  return user?.username ? `@${user.username}` : null;
}

/** Ім'я на платформі — головне ім'я людини в продукті. */
export function platformHandle(user: UserProfileData | null): string | null {
  return user?.platformUsername ? `@${user.platformUsername}` : null;
}

/**
 * «З нами з 18.09.2026» — коли з'явився рядок людини.
 *
 * Саме `created_at`, а не «вхід у бота» чи «вхід на платформу»: у `users`
 * цих подій окремо немає, а вигадувати дату з нічого гірше, ніж показати ту,
 * яка справді є. Час у рядку не потрібен — це дата приєднання, не подія.
 */
export function joinedLine(user: UserProfileData | null): string | null {
  return user?.createdAt ? `З нами з ${formatDay(user.createdAt)}` : null;
}

/** Літера замість фото — так само, як у картці профілю. */
export function avatarInitial(user: UserProfileData | null): string {
  return (user?.firstName ?? "").trim().charAt(0).toUpperCase() || "?";
}
