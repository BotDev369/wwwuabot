/**
 * Перевірка Telegram Mini App `initData`.
 *
 * Telegram підписує initData ключем HMAC-SHA256("WebAppData", bot_token),
 * тому підпис можна перевірити на воркері й довіряти `user.id` з нього.
 * Це ЄДИНЕ довірене джерело ідентичності користувача в TWA — заголовки
 * на кшталт `X-Telegram-User-Id` приймати не можна, вони підробляються.
 *
 * Документація:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * @module packages/shared/src/security/telegram
 */

/** Заголовок, у якому TWA передає підписаний `initData`. */
export const INIT_DATA_HEADER = "X-Telegram-Init-Data";

/** Максимальний вік initData (Telegram рекомендує перевіряти auth_date). */
export const INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60;

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Повертає Telegram `user_id`, якщо підпис initData валідний і не протух.
 * Інакше — `null`. Ніколи не кидає виняток.
 */
export async function verifyInitData(initData: string, botToken: string): Promise<number | null> {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");

  const checkString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const secretKey = await hmac(new TextEncoder().encode("WebAppData"), botToken);
  const expected = toHex(await hmac(secretKey, checkString));
  if (expected !== hash.toLowerCase()) return null;

  const authDate = Number(params.get("auth_date"));
  if (!Number.isFinite(authDate)) return null;
  if (Date.now() / 1000 - authDate > INIT_DATA_MAX_AGE_SECONDS) return null;

  try {
    const user = JSON.parse(params.get("user") ?? "");
    const userId = Number(user?.id);
    return Number.isFinite(userId) ? userId : null;
  } catch {
    return null;
  }
}

// ── Браузерна частина ─────────────────────────────────────────────
// Читаємо через globalThis, щоб модуль залишався придатним і для воркерів
// (там Telegram WebApp відсутній і функції просто повертають порожньо).

interface TelegramGlobal {
  Telegram?: { WebApp?: { initData?: string } };
}

/** Підписаний `initData` поточного Mini App, або `""` поза Telegram. */
export function readInitData(): string {
  try {
    return (globalThis as TelegramGlobal).Telegram?.WebApp?.initData ?? "";
  } catch {
    return "";
  }
}

/**
 * Заголовки ідентичності для запиту до API.
 * Поза Telegram повертає порожній об'єкт — сервер відповість 401.
 */
export function telegramAuthHeaders(): Record<string, string> {
  const initData = readInitData();
  return initData ? { [INIT_DATA_HEADER]: initData } : {};
}
