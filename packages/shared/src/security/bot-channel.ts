/**
 * Підписаний канал api-dev → bot: HMAC на метод, шлях, час і тіло.
 *
 * Telegram редагує й видаляє бот (він надіслав), а канал закритий підписом на
 * 60 с із спільним `BOT_TOKEN`, а не статичним секретом у заголовку.
 *
 * @module @wwwuabot/shared/security/bot-channel
 */

/** Шлях службового каналу в боті. Один шлях на обидві дії — підпис спільний. */
export const BOT_CHANNEL_PATH = "/internal/message";

/** Заголовок із міткою часу й підписом: `t=<сек>,v1=<hex>`. */
export const BOT_CHANNEL_HEADER = "X-Bot-Channel";

/** Скільки живе підпис. Більше — це вже довгоживучий ключ у заголовку. */
export const BOT_CHANNEL_TTL_SECONDS = 60;

export type BotChannelAction = "edit" | "delete";

/** Тіло каналу: що зробити з конкретним повідомленням конкретної людини. */
export interface BotChannelPayload {
  action: BotChannelAction;
  chatId: number;
  messageId: number;
  /** Новий текст — лише для `edit`. */
  text?: string;
  /** Як відправити текст: rich-екран бота чи звичайне повідомлення. */
  format?: "rich" | "plain";
}

export type BotChannelVerdict =
  { ok: true } | { ok: false; reason: "missing" | "malformed" | "stale" | "signature" };

function channelMessage(method: string, path: string, timestamp: number, body: string): string {
  return `${method.toUpperCase()}\n${path}\n${timestamp}\n${body}`;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** Порівняння без раннього виходу: різниця довжин — теж невдача. */
function sameHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Підписати запит. `now` — для тестів; у рантаймі годинник системи. */
export async function signBotChannel(
  secret: string,
  input: { method: string; path: string; body: string; now?: number },
): Promise<string> {
  const timestamp = Math.floor((input.now ?? Date.now()) / 1000);
  const signature = await hmacHex(
    secret,
    channelMessage(input.method, input.path, timestamp, input.body),
  );
  return `t=${timestamp},v1=${signature}`;
}

/**
 * Перевірити підпис і вік мітки. Метод, шлях і тіло беруться з **фактичного**
 * запиту: підміна будь-чого з них ламає підпис.
 */
export async function verifyBotChannel(
  secret: string | undefined,
  input: {
    method: string;
    path: string;
    body: string;
    header: string | null;
    now?: number;
    ttlSeconds?: number;
  },
): Promise<BotChannelVerdict> {
  if (!secret) return { ok: false, reason: "missing" };
  if (!input.header) return { ok: false, reason: "missing" };

  const match = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(input.header.trim());
  if (!match) return { ok: false, reason: "malformed" };

  const timestamp = Number(match[1]);
  const age = Math.floor((input.now ?? Date.now()) / 1000) - timestamp;
  const ttl = input.ttlSeconds ?? BOT_CHANNEL_TTL_SECONDS;
  if (!Number.isFinite(age) || age < -5 || age > ttl) return { ok: false, reason: "stale" };

  const expected = await hmacHex(
    secret,
    channelMessage(input.method, input.path, timestamp, input.body),
  );
  return sameHex(expected, match[2]) ? { ok: true } : { ok: false, reason: "signature" };
}

/** Текст адміна → rich-HTML: екрануємо розмітку, рядки лишаємо рядками. */
export function plainTextToRichHtml(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n/g, "<br/>")}</p>`;
}
