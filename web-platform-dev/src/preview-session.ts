/**
 * Сесія прев'ю: питає `/api/dev/preview-session` (у проді 404) і ставить
 * `initData` до першого рендеру — `AuthGate` читає його вже на першому кадрі.
 *
 * @module web-platform-dev/src/preview-session
 */

/** Адреса сесії: тільки `dev` (`api-dev/src/controllers/preview-session.controller.ts`). */
const PREVIEW_ENDPOINT = "/api/dev/preview-session";

/**
 * Скільки разів питати. Холодний дев-воркер відповідає 5xx на перший запит;
 * без повтору екран лишався порожнім до перезавантаження, тож спроб кілька.
 * 404 — не відмова, а «прод»: його не повторюємо.
 */
const ATTEMPTS = 3;

/** Пауза перед повтором, помножена на номер спроби: 250 + 500 мс. */
const RETRY_DELAY_MS = 250;

/** `initData` у `Telegram.WebApp` — так само, як його ставить Telegram. */
function installIdentity(initData: string): void {
  const params = new URLSearchParams(initData);
  const existing = window.Telegram?.WebApp;
  const app = Object.create(existing ?? null) as TelegramWebAppLike;
  Object.defineProperties(app, {
    initData: { value: initData, enumerable: true },
    initDataUnsafe: {
      enumerable: true,
      value: {
        user: JSON.parse(params.get("user") ?? "{}"),
        auth_date: Number(params.get("auth_date")),
        hash: params.get("hash"),
      },
    },
  });
  window.Telegram = { ...(window.Telegram ?? {}), WebApp: app };
}

/** Мінімум, який читає застосунок: решта методів приходить із SDK у прототипі. */
interface TelegramWebAppLike {
  initData: string;
  initDataUnsafe: Record<string, unknown>;
}

/**
 * Одна спроба: `initData`, `null` — сесії тут немає взагалі (прод), помилка —
 * відмова, яку має сенс повторити (мережа, холодний воркер, порожня відповідь).
 */
async function readSession(): Promise<string | null> {
  const response = await fetch(PREVIEW_ENDPOINT, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`preview session: ${response.status}`);
  const body = (await response.json()) as { initData?: unknown };
  if (typeof body.initData !== "string" || !body.initData) {
    throw new Error("preview session: empty response");
  }
  return body.initData;
}

/**
 * Ставить сесію прев'ю, якщо вона є. Ніколи не кидає: без сесії сторінка
 * показує те саме, що й раніше — тобто нічого, і це правильно поза Telegram.
 */
export async function installPreviewSession(): Promise<void> {
  if (window.Telegram?.WebApp?.initData) return;

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
    try {
      const initData = await readSession();
      if (!initData) return;
      installIdentity(initData);
      return;
    } catch {
      // Холодний дев-воркер: наступна спроба; остання — сторінка без сесії.
    }
  }
}
