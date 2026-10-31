/**
 * Клієнт публічного API Є-data: таймаут, бекоф і побудова адрес.
 *
 * Джерело віддає `503` уже на кількох одночасних запитах і не має ні
 * `Retry-After`, ні `X-RateLimit-*`, тож пауза й бекоф живуть тут, а не в
 * тому, хто кличе. Межі — docs/SPENDING.md §2.
 * @module api-dev/src/services/spending/source
 */

import { SPENDING_BASE_URL } from "./config";

const USER_AGENT = "wwwuabot-spending-collector/0.1";

/** `429` і `5xx` — «забагато одразу» або збій; інші коди означають помилку запиту. */
const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

export class SourceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SourceError";
  }
}

export interface FetchOptions {
  readonly timeoutMs?: number;
  readonly retries?: number;
}

/** Пауза між запитами: тримає нас нижче межі джерела. */
export function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Читає JSON із джерела, повторюючи запит на `429`/`5xx`.
 *
 * `404` і `400` не повторюються: це відповідь про запит, а не про сервіс, і
 * повтор її не змінить. Остання помилка повертається назовні як є — щоб
 * звіт прогону називав причину, а не «щось пішло не так».
 */
export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { timeoutMs = 30_000, retries = 3 } = options;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    if (attempt > 0) await pause(500 * 2 ** attempt);

    try {
      const response = await fetch(url, {
        headers: { accept: "application/json", "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const error = new SourceError(`Є-data відповіло ${response.status}`, response.status);
        if (!RETRY_STATUSES.has(response.status)) throw error;
        lastError = error;
        continue;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof SourceError && !RETRY_STATUSES.has(error.status)) throw error;
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new SourceError("Є-data недоступне", 0);
}

/** Довідник розпорядника: назва, форма, `kopfg`, `koatuu`, КВЕД. */
export function disposerUrl(edrpou: string): string {
  return `${SPENDING_BASE_URL}/disposers/${edrpou}`;
}

/** Договори за вікно: `documentDateFrom` / `documentDateTo` — єдиний робочий спосіб. */
export function contractsUrl(edrpou: string, from: string, to: string): string {
  const params = new URLSearchParams({
    disposerId: edrpou,
    documentDateFrom: from,
    documentDateTo: to,
  });
  return `${SPENDING_BASE_URL}/disposers/contracts?${params.toString()}`;
}

/** Платежі кількох розпорядників одним запитом — не більше 10 кодів. */
export function transactionsUrl(codes: readonly string[], from: string, to: string): string {
  const params = new URLSearchParams({
    payers_edrpous: codes.join(","),
    startdate: from,
    enddate: to,
  });
  return `${SPENDING_BASE_URL}/api/transactions/?${params.toString()}`;
}

/** Дата останнього завантаження по кожному джерелу. */
export function lastLoadUrl(): string {
  return `${SPENDING_BASE_URL}/api/transactions/lastload`;
}
