/**
 * Заголовки безпеки — одна реалізація на всі три воркери: `helmet` тут не
 * працює (це Workers), а CORS не «*», а лише джерело запиту (зірочка стояла
 * на HTML адмінки). Три винятки CSP внизу «полагодити» не можна — причини в
 * `docs/SECURITY.md`, як і вся розгорнута аргументація.
 *
 * @module packages/shared/src/security/headers
 */

/** Заголовки, які діють усюди й нічого не ламають у браузері. */
const BASE_HEADERS: Readonly<Record<string, string>> = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Cross-Origin-Opener-Policy": "same-origin",
};

/** CSP для оболонок; три винятки нижче — через Telegram SDK, інлайн-стилі блоків і фото в R2 (docs/SECURITY.md). */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' https://telegram.org",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://telegram.org",
  "manifest-src 'self'",
].join("; ");

/** localhost, `127.0.0.1` і `[::1]` — дев-сервер, де CSP лише заважає HMR. */
function isLocal(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/** CSP для дев-сервера: Vite вставляє інлайнові скрипти (react-refresh, HMR). */
const CSP_DEV = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss: https://telegram.org",
].join("; ");

export interface SecurityHeaderOptions {
  /**
   * URL поточного запиту: з нього береться hostname (вибір CSP) і origin
   * (CORS). Без нього CSP береться **строгий**: незнання середовища — не
   * привід послабити політику.
   */
  url?: string;
  /** Чи ставити `Strict-Transport-Security`. Вимикається для HTTP-локалки. */
  hsts?: boolean;
  /** Чи ставити `Content-Security-Policy` (оболонки). Вимкнено для API. */
  csp?: boolean;
}

/**
 * Чи треба HSTS: лише для справжнього HTTPS. На `http://localhost` цей
 * заголовок зробив би браузер нездатним відкрити локальний сервер уперше.
 */
function wantsHsts(url: string | undefined, explicit: boolean | undefined): boolean {
  if (explicit !== undefined) return explicit;
  return url !== undefined && new URL(url).protocol === "https:";
}

/**
 * Накласти заголовки безпеки на відповідь воркера.
 *
 * Функція не мусить знати, який воркер її кликає: вона працює з готовим
 * `Response` і повертає новий із тим самим тілом — саме тому одна реалізація
 * покриває асети, JSON і помилкові відповіді однаково.
 */
export function applySecurityHeaders(
  response: Response,
  options: SecurityHeaderOptions = {},
): Response {
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(BASE_HEADERS)) headers.set(name, value);

  if (options.csp) {
    const hostname = options.url ? new URL(options.url).hostname : "";
    // Порожній hostname — не локалка, тож строгий варіант.
    headers.set("Content-Security-Policy", hostname && isLocal(hostname) ? CSP_DEV : CSP);
  }
  if (wantsHsts(options.url, options.hsts)) {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * CORS замість `*`: заголовок з'являється лише тоді, коли `Origin` запиту
 * збігається з origin самого запиту. Для запитів без `Origin` (перевірка
 * черги, `curl`, service binding) заголовок не потрібен і не ставиться.
 *
 * `Vary: Origin` обов'язковий: інакше кеш віддасть відповідь із заголовком
 * іншого джерела.
 */
export function applySameOriginCors(response: Response, requestUrl?: string): Response {
  const headers = new Headers(response.headers);
  const origin = requestUrl ? new URL(requestUrl).origin : undefined;
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.append("Vary", "Origin");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Разом: заголовки безпеки + CORS. Точка входу одна, щоб не було трьох
 * копій виклику, які розійдуться при першій же правці.
 */
export function secureResponse(response: Response, options: SecurityHeaderOptions = {}): Response {
  return applySameOriginCors(applySecurityHeaders(response, options), options.url);
}
