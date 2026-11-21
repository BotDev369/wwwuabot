/**
 * Сесія прев'ю в застосунку: сторінка відкривається в звичайному браузері.
 * Питає лише `/api/dev/preview-session` (тільки `dev`, у проді 404) і ставить
 * сесію до першого рендеру — `AuthGate` читає `initData` вже на першому кадрі.
 *
 * @module web-platform-dev/src/preview-session
 */

/** Адреса сесії: тільки `dev` (`api-dev/src/controllers/preview-session.controller.ts`). */
const PREVIEW_ENDPOINT = "/api/dev/preview-session";

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
 * Ставить сесію прев'ю, якщо вона є. Ніколи не кидає: без сесії сторінка
 * показує те саме, що й раніше — тобто нічого, і це правильно поза Telegram.
 */
export async function installPreviewSession(): Promise<void> {
  if (window.Telegram?.WebApp?.initData) return;

  try {
    const response = await fetch(PREVIEW_ENDPOINT, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return;
    const body = (await response.json()) as { initData?: unknown };
    if (typeof body.initData !== "string" || !body.initData) return;
    installIdentity(body.initData);
  } catch {
    // Мережа чи старий дев-воркер: прев'ю просто немає, помилки немає.
  }
}
