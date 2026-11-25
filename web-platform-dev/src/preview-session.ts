/**
 * Сесія прев'ю: питає `/api/dev/preview-session` і ставить `initData` до першого
 * рендеру. Лише за ключем у адресі (`/?preview=<ключ>`), інакше запиту немає:
 * ендпоїнт підписує власника. Ключ живе в `sessionStorage`, з адреси його
 * прибираємо — див. `web-platform-dev/README.md`.
 *
 * @module web-platform-dev/src/preview-session
 */

/** Адреса сесії: тільки `dev` (`api-dev/src/controllers/preview-session.controller.ts`). */
const PREVIEW_ENDPOINT = "/api/dev/preview-session";

/** Параметр адреси, яким власник один раз показує ключ. */
const PREVIEW_KEY_PARAM = "preview";

/** Де ключ живе після цього — до кінця вкладки. */
const PREVIEW_KEY_STORAGE = "preview-session-key";

/**
 * Скільки разів питати. Холодний дев-воркер відповідає 5xx на перший запит;
 * без повтору екран лишався порожнім до перезавантаження, тож спроб кілька.
 * 404 — не відмова, а «прод» або «ключа немає»: його не повторюємо.
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
 * Ключ прев'ю: з адреси (і тоді з адреси його прибираємо) або зі сховища
 * вкладки. `null` — прев'ю тут не просили, і запиту не буде.
 */
function previewKey(): string | null {
  try {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get(PREVIEW_KEY_PARAM)?.trim() ?? "";
    if (fromUrl) {
      sessionStorage.setItem(PREVIEW_KEY_STORAGE, fromUrl);
      url.searchParams.delete(PREVIEW_KEY_PARAM);
      window.history.replaceState(window.history.state, "", url.toString());
      return fromUrl;
    }
    return sessionStorage.getItem(PREVIEW_KEY_STORAGE)?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * Одна спроба: `initData`, `null` — сесії тут немає взагалі (прод або немає
 * ключа), помилка — відмова, яку має сенс повторити (мережа, холодний воркер,
 * порожня відповідь).
 */
async function readSession(key: string): Promise<string | null> {
  const response = await fetch(PREVIEW_ENDPOINT, {
    headers: { Accept: "application/json", "X-Preview-Key": key },
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
 * Ставить сесію прев'ю, якщо її просили. Ніколи не кидає: без ключа сторінка
 * показує те саме, що й раніше — тобто нічого, і це правильно поза Telegram.
 */
export async function installPreviewSession(): Promise<void> {
  if (window.Telegram?.WebApp?.initData) return;

  const key = previewKey();
  if (!key) return;

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
    }
    try {
      const initData = await readSession(key);
      if (!initData) return;
      installIdentity(initData);
      return;
    } catch {
      // Холодний дев-воркер: наступна спроба; остання — сторінка без сесії.
    }
  }
}
