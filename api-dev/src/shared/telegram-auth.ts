/**
 * Перевірка Telegram Mini App `initData`.
 *
 * Telegram підписує initData ключем HMAC-SHA256("WebAppData", bot_token),
 * тому підпис можна перевірити на воркері й довіряти user.id з нього.
 * Документація: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */

/** Максимальний вік initData (Telegram рекомендує перевіряти auth_date). */
const MAX_AGE_SECONDS = 24 * 60 * 60;

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
 * Повертає Telegram user_id, якщо підпис initData валідний і не протух,
 * інакше — null.
 */
export async function verifyInitData(
  initData: string,
  botToken: string,
): Promise<number | null> {
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
  if (Date.now() / 1000 - authDate > MAX_AGE_SECONDS) return null;

  try {
    const user = JSON.parse(params.get("user") ?? "");
    const userId = Number(user?.id);
    return Number.isFinite(userId) ? userId : null;
  } catch {
    return null;
  }
}
