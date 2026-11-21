/**
 * Сесія прев'ю: справжній підпис Telegram, щоб подивитися сторінку без чату.
 * Підписує лише `dev` і лише власника (`docs/ANALYSIS.md`); WebCrypto, а не
 * `node:crypto`: той самий код іде і у воркер, і в браузер.
 *
 * @module @wwwuabot/shared/security/preview-session
 */

/** Скільки байтів у HMAC-SHA256. */
const HMAC_LENGTH = 32;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** `HMAC_SHA256(key, data)` — один ключ, один підпис. */
async function hmacSha256(key: Uint8Array, data: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as unknown as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
  return new Uint8Array(signature).slice(0, HMAC_LENGTH);
}

/**
 * `initData` для однієї людини — той самий формат, що віддає Telegram.
 *
 * Порядок ключів той самий, що в Telegram:
 * `HMAC_SHA256(HMAC_SHA256("WebAppData", token), checkString)`. `auth_date`
 * свіжий щоразу, бо `api-dev` відкидає підпис, старший за добу.
 */
export async function signPreviewInitData(
  token: string,
  userId: number,
  now = Date.now(),
): Promise<string> {
  const params: Record<string, string> = {
    query_id: `AAA${userId}`,
    user: JSON.stringify({ id: userId, first_name: "Preview", language_code: "uk" }),
    chat_type: "private",
    auth_date: String(Math.floor(now / 1000)),
  };

  const checkString = Object.entries(params)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");
  const secret = await hmacSha256(new TextEncoder().encode("WebAppData"), token);
  const hash = toHex(await hmacSha256(secret, checkString));

  return new URLSearchParams({ ...params, hash }).toString();
}

/**
 * Замінює `Telegram.WebApp` обгорткою з нашими `initData`/`initDataUnsafe`.
 *
 * Заміною, а не присвоєнням: SDK оголошує обидва поля гетерами без сетера, тож
 * записати в них неможливо. SDK лишається прототипом обгортки — його методи
 * (`ready`, тема, висота) працюють як і в Telegram.
 */
export function previewSessionShim(initData: string): string {
  return `(function () {
  var data = ${JSON.stringify(initData)};
  var params = new URLSearchParams(data);
  var app = Object.create((window.Telegram && window.Telegram.WebApp) || null);
  Object.defineProperties(app, {
    initData: { value: data, enumerable: true },
    initDataUnsafe: {
      enumerable: true,
      value: {
        user: JSON.parse(params.get("user")),
        auth_date: Number(params.get("auth_date")),
        hash: params.get("hash")
      }
    }
  });
  window.Telegram = window.Telegram || {};
  window.Telegram.WebApp = app;
})();`;
}
