/**
 * Два акаунти однієї людини — у вигляді чистих функцій.
 *
 * У людини їх справді **два**, і вони різні: **платформа** (ім'я, яке вона обрала
 * тут, і фото, яке вона поставить) та **Telegram** (усе, що Telegram віддав про
 * неї, як є). Тому тут окремо `platformPhoto` і `telegramPhoto`: якщо «фото»
 * брати з одного поля, `#karas` одного дня показав би фото Telegram — і два різні
 * акаунти злились би в один, а імені на платформі не було б за що триматись.
 *
 * Живуть вони тут, а не в компоненті, бо те саме правило потрібне **трьом**
 * місцям (рядок хабу, розділ «Платформа», розділ «Телеграм»), а копія правила
 * розходиться з оригіналом першою.
 *
 * @module @wwwuabot/shared/components/user-profile/account
 */

import { formatPlatformUsername } from "../../user/platform-username";
import type { UserProfileData } from "./types";

/** Непорожній рядок або `undefined`: `""`, `null` і `undefined` — це «немає». */
function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/** Поле з payload Telegram (`telegram_json` / живий `initData.user`). */
function fromTelegram(user: UserProfileData, key: string): string | undefined {
  const payload = user.telegram;
  if (!payload || typeof payload !== "object") return undefined;
  return text(payload[key]);
}

/** Ім'я на платформі в показі: `#karas`, або `undefined`, якщо його ще немає. */
export function platformLabel(user: UserProfileData | null | undefined): string | undefined {
  return user ? formatPlatformUsername(user.platformUsername) : undefined;
}

/**
 * Фото **платформи**. Поки людина його не поставила, тут порожньо — і це чесно:
 * підставляти замість нього фото Telegram означало б показувати чуже як своє.
 */
export function platformPhoto(user: UserProfileData | null | undefined): string | undefined {
  return user ? text(user.photoUrl) : undefined;
}

/** Фото **Telegram** — `photo_url` із підписаного `initData` (не запит до Telegram). */
export function telegramPhoto(user: UserProfileData | null | undefined): string | undefined {
  return user ? fromTelegram(user, "photo_url") : undefined;
}

/** Ім'я з Telegram: як є з payload, а як payload порожній — з рядка `users`. */
export function telegramName(user: UserProfileData | null | undefined): string | undefined {
  if (!user) return undefined;

  const fromPayload = [fromTelegram(user, "first_name"), fromTelegram(user, "last_name")]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (fromPayload) return fromPayload;

  const fromRow = [text(user.firstName), text(user.lastName)].filter(Boolean).join(" ").trim();
  return fromRow || undefined;
}

/** Telegram-хендл у вигляді `@name` — або `undefined`, якщо хендла немає. */
export function telegramHandle(user: UserProfileData | null | undefined): string | undefined {
  if (!user) return undefined;
  const handle = fromTelegram(user, "username") ?? text(user.username);
  return handle ? `@${handle}` : undefined;
}

/** Мова інтерфейсу Telegram: `language_code` — код, який віддає сам Telegram. */
export function telegramLanguage(user: UserProfileData | null | undefined): string | undefined {
  if (!user) return undefined;
  return fromTelegram(user, "language_code") ?? text(user.language);
}

/** Telegram Premium — показуємо лише коли він справді є. */
export function telegramIsPremium(user: UserProfileData | null | undefined): boolean {
  return user?.telegram?.is_premium === true;
}

/**
 * Літера замість фото. Береться з того самого підпису, який стоїть поруч:
 * літера, що не збігається з рядком, читалась би як чужий аватар.
 */
export function accountInitial(
  user: UserProfileData | null | undefined,
  source?: string | undefined,
): string {
  const label = source ?? platformLabel(user) ?? telegramName(user) ?? "";
  return label.replace(/^[@#]/u, "").charAt(0).toUpperCase() || "?";
}
