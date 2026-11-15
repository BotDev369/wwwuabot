/**
 * Адмінська cookie-сесія: HMAC-SHA256 підпис токена.
 *
 * Спільний код для `api-dev` (створення сесії) і `web-admin-dev`
 * (перевірка перед проксюванням). Раніше існував у двох копіях —
 * будь-яка розбіжність ламала авторизацію тихо.
 *
 * Модуль чистий: не знає ні про `Env`, ні про біндинги воркера.
 * Секрет передається аргументом, а рішення «що робити при провалі»
 * приймає виклик — це різні обов'язки (див. AGENTS.md §3).
 *
 * Формат токена: `<payload>.<hex-підпис>`, де payload = `admin:<expiresMs>`.
 *
 * @module packages/shared/src/security/session
 */

/** Ім'я cookie адмінської сесії. */
export const ADMIN_COOKIE_NAME = "admin_session";

/** Час життя сесії — 8 годин. */
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 8;

/**
 * Другий вхід — для Buffy: окрема cookie й окремий префікс payload.
 *
 * Cookie різна, щоб вихід з одного входу не вибивав інший; префікс різний,
 * щоб адмінський токен не можна було підсунути як «стільний» і навпаки.
 */
export const DESK_COOKIE_NAME = "desk_session";

/** Довгий термін: стіл — щоденна поверхня, а не разова дія. */
export const DESK_SESSION_TTL_SECONDS = 60 * 60 * 24 * 90;

/** Префікс payload для входу стола. */
export const DESK_PAYLOAD_PREFIX = "buffy:";

/** Чия це сесія. `serhii` — уся панель, `buffy` — лише стіл. */
export type SessionSide = "serhii" | "buffy";

/** Розбиває заголовок `Cookie` на пари ключ/значення. */
export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k.trim(), v.join("=").trim()];
    }),
  );
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Парсить hex-рядок у буфер; повертає null, якщо рядок не hex.
 *
 * Повертає саме `ArrayBuffer`, а не `Uint8Array`: типізовані масиви
 * у сучасному TypeScript параметризовані буфером, і `Uint8Array<ArrayBufferLike>`
 * не задовольняє `BufferSource`.
 */
function hexToBuffer(hex: string): ArrayBuffer | null {
  if (hex.length === 0 || hex.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
  const buffer = new ArrayBuffer(hex.length / 2);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return buffer;
}

/** Час закінчення нової сесії (мс від епохи). */
export function sessionExpiresAt(ttlSeconds = ADMIN_SESSION_TTL_SECONDS): number {
  return Date.now() + ttlSeconds * 1000;
}

/** Підписує payload: повертає `<payload>.<hex-підпис>`. */
export async function signSessionToken(payload: string, secret: string): Promise<string> {
  const key = await importHmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  const hex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${payload}.${hex}`;
}

/**
 * Коли спливає сесія цього токена (мс від епохи), або `null`, якщо payload
 * не має числа.
 *
 * Читає payload, **не перевіряючи підпис**: це не авторизація, а показ
 * («сесія діє до 21:36»), і викликати його можна лише після
 * `verifySessionToken` — інакше підпис не значив би нічого.
 */
export function sessionTokenExpiresAt(token: string): number | null {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return null;

  const [, expiresStr] = token.slice(0, lastDot).split(":");
  const expires = parseInt(expiresStr, 10);
  return Number.isFinite(expires) ? expires : null;
}

/** Перевіряє підпис токена і термін його дії. */
export async function verifySessionToken(token: string, secret: string): Promise<boolean> {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;

  const payload = token.slice(0, lastDot);
  const signature = hexToBuffer(token.slice(lastDot + 1));
  if (!signature) return false;

  const key = await importHmacKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    new TextEncoder().encode(payload),
  );
  if (!valid) return false;

  const expires = sessionTokenExpiresAt(token);
  if (expires === null || Date.now() > expires) return false;
  return true;
}

/** Чи має запит валідну адмінську сесію. */
export async function hasValidSession(
  request: Request,
  secret: string | undefined,
): Promise<boolean> {
  if (!secret) return false;
  const token = parseCookies(request.headers.get("Cookie"))[ADMIN_COOKIE_NAME];
  if (!token) return false;
  return verifySessionToken(token, secret);
}

/**
 * Чия сесія в цього запиту. `null` — жодної валідної.
 *
 * Підпис перевіряється **до** того, як повірити префіксу: інакше cookie з
 * чужим payload виглядала б як вхід.
 */
export async function sessionSide(
  request: Request,
  secret: string | undefined,
): Promise<SessionSide | null> {
  if (!secret) return null;
  const cookies = parseCookies(request.headers.get("Cookie"));

  const admin = cookies[ADMIN_COOKIE_NAME];
  if (admin && payloadOf(admin).startsWith("admin:")) {
    if (await verifySessionToken(admin, secret)) return "serhii";
  }

  const desk = cookies[DESK_COOKIE_NAME];
  if (desk && payloadOf(desk).startsWith(DESK_PAYLOAD_PREFIX)) {
    if (await verifySessionToken(desk, secret)) return "buffy";
  }

  return null;
}

/** Payload токена без підпису: рішення про бік ухвалює лише після перевірки. */
function payloadOf(token: string): string {
  const lastDot = token.lastIndexOf(".");
  return lastDot === -1 ? token : token.slice(0, lastDot);
}

/** Значення заголовка `Set-Cookie` для входу в стіл. */
export function buildDeskSessionCookie(
  token: string,
  ttlSeconds = DESK_SESSION_TTL_SECONDS,
): string {
  return [
    `${DESK_COOKIE_NAME}=${token}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${ttlSeconds}`,
  ].join("; ");
}

/** Значення заголовка `Set-Cookie`, що гасить вхід у стіл. */
export function buildClearedDeskSessionCookie(): string {
  return `${DESK_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

/** Значення заголовка `Set-Cookie` для видачі сесії. */
export function buildSessionCookie(token: string, ttlSeconds = ADMIN_SESSION_TTL_SECONDS): string {
  return [
    `${ADMIN_COOKIE_NAME}=${token}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${ttlSeconds}`,
  ].join("; ");
}

/** Значення заголовка `Set-Cookie` для виходу. */
export function buildClearedSessionCookie(): string {
  return `${ADMIN_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}
