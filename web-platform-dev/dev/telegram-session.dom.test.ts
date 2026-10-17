// @vitest-environment jsdom
/**
 * Сесія прев'ю: підпис і підміна `Telegram.WebApp`.
 *
 * Підпис перевіряє **спільна** функція (`verifyInitDataPayload`) — та сама, що
 * стоїть в `api-dev`, тож тест ловить розходження з алгоритмом Telegram, а не
 * звіряє реалізацію саму з собою. Обгортка перевіряється окремо, бо в неї є
 * пастка: SDK оголошує `initData` гетером без сетера, тож просте присвоєння
 * мовчки не працює — і прев'ю виглядало б порожнім без жодної помилки.
 *
 * @module web-platform-dev/dev/telegram-session.dom.test
 */

import { describe, expect, it } from "vitest";
import { verifyInitDataPayload } from "@wwwuabot/shared/security/telegram";
import {
  PREVIEW_SESSION_PATH,
  PREVIEW_TOKEN_VAR,
  PREVIEW_USER_VAR,
  pickPreviewUserId,
  readPreviewSession,
  sessionShim,
  signInitData,
  telegramPreviewSession,
} from "./telegram-session.ts";

const TOKEN = "123456:test-token";
const IDENTITY = { token: TOKEN, userId: 4242 };

interface FakeWebApp {
  initData?: string;
  initDataUnsafe?: { user?: { id?: number }; hash?: string };
  ready?: () => void;
}

const telegramGlobal = globalThis as unknown as { Telegram?: { WebApp?: FakeWebApp } };

describe("підпис сесії прев'ю", () => {
  it("приймає спільна перевірка, якою користується api-dev", async () => {
    const payload = await verifyInitDataPayload(signInitData(IDENTITY), TOKEN);

    expect(payload?.userId).toBe(IDENTITY.userId);
    expect(payload?.user.first_name).toBe("Preview");
    expect(Date.now() / 1000 - (payload?.authDate ?? 0)).toBeLessThan(60);
  });

  it("чужий токен підпис не приймає", async () => {
    const payload = await verifyInitDataPayload(signInitData(IDENTITY), `${TOKEN}-other`);
    expect(payload).toBeNull();
  });

  it("протухлий підпис не проходить", async () => {
    const dayOld = Date.now() - 25 * 60 * 60 * 1000;
    const payload = await verifyInitDataPayload(signInitData(IDENTITY, dayOld), TOKEN);
    expect(payload).toBeNull();
  });
});

describe("перемикання акаунтів", () => {
  const session = { token: TOKEN, ids: [11, 22] };

  it("без `?as=` підписуємо типовий id — перший у списку", () => {
    expect(pickPreviewUserId(session)).toBe(11);
  });

  it("дозволений id зі списку проходить", () => {
    expect(pickPreviewUserId(session, "22")).toBe(22);
  });

  it("id поза списком не підписується взагалі", () => {
    expect(pickPreviewUserId(session, "33")).toBeNull();
    expect(pickPreviewUserId(session, "не число")).toBeNull();
  });

  it("розбирає список і називає саме відсутні змінні", () => {
    const withBoth = readPreviewSession({ BOT_TOKEN_DEV: TOKEN, PREVIEW_TELEGRAM_ID: "11, 22" });
    expect(withBoth.session?.ids).toEqual([11, 22]);

    expect(readPreviewSession({ PREVIEW_TELEGRAM_ID: "11" }).missing).toEqual(["BOT_TOKEN_DEV"]);
    expect(readPreviewSession({ BOT_TOKEN_DEV: TOKEN }).missing).toEqual(["PREVIEW_TELEGRAM_ID"]);
  });
});

describe("обгортка Telegram.WebApp", () => {
  it("перекриває initData навіть коли SDK тримає його гетером", () => {
    const initData = signInitData(IDENTITY);
    const sdk: FakeWebApp = { ready: () => undefined };
    Object.defineProperty(sdk, "initData", { get: () => "", enumerable: true });

    telegramGlobal.Telegram = { WebApp: sdk };
    new Function(sessionShim(initData))();

    expect(telegramGlobal.Telegram?.WebApp?.initData).toBe(initData);
    expect(telegramGlobal.Telegram?.WebApp?.initDataUnsafe?.user?.id).toBe(IDENTITY.userId);
    // Методи SDK лишаються доступними: обгортка тримає SDK прототипом.
    expect(typeof telegramGlobal.Telegram?.WebApp?.ready).toBe("function");
  });
});

/**
 * Мінімум сервера розробки, який потрібен плагіну: журнал і точка входу.
 *
 * Фейк, а не справжній Vite: перевіряється те, що плагін **каже** застосунку —
 * підписана сесія або відмова, — а не те, як Vite будує middleware.
 */
function fakeServer() {
  const logs: string[] = [];
  let handler: ((request: FakeRequest, response: FakeResponse) => void) | null = null;
  const server = {
    config: {
      logger: {
        warn: (message: string) => logs.push(`warn: ${message}`),
        info: (message: string) => logs.push(`info: ${message}`),
      },
    },
    middlewares: {
      use: (path: string, next: (request: FakeRequest, response: FakeResponse) => void) => {
        if (path === PREVIEW_SESSION_PATH) handler = next;
      },
    },
  };
  return { logs, server, handler: () => handler };
}

function configure(env: NodeJS.ProcessEnv) {
  const fake = fakeServer();
  const plugin = telegramPreviewSession(env);
  const hook = plugin.configureServer as unknown as (server: unknown) => void;
  hook(fake.server);
  return fake;
}

function fakeResponse(): FakeResponse {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(body = "") {
      this.body = body;
    },
  };
}

interface FakeRequest {
  headers: Record<string, string | undefined>;
  url: string;
}

interface FakeResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  setHeader: (key: string, value: string) => void;
  end: (body?: string) => void;
}

describe("плагін прев'ю", () => {
  const ENV = { [PREVIEW_TOKEN_VAR]: TOKEN, [PREVIEW_USER_VAR]: "11, 22" };

  it("без змінних не чіпає розмітку й називає причину", () => {
    const fake = configure({});

    expect(fake.handler()).toBeNull();
    expect(fake.logs.join(" ")).toContain(PREVIEW_TOKEN_VAR);
  });

  it("віддає підписану сесію для вибраного з адреси id", () => {
    const fake = configure(ENV);
    const response = fakeResponse();

    fake.handler()?.({ headers: { referer: "http://localhost/?as=22" }, url: "/" }, response);

    expect(response.statusCode).toBe(200);
    expect(userIdFromInitData(initDataFromShim(response.body))).toBe(22);
  });

  it("невідомий id не отримує підпису", () => {
    const fake = configure(ENV);
    const response = fakeResponse();

    fake.handler()?.({ headers: { referer: "http://localhost/?as=99" }, url: "/" }, response);

    expect(response.statusCode).toBe(403);
    expect(response.body).not.toContain("hash=");
  });
});

/** `initData` з тіла скрипта: там він лежить рядковим літералом JS. */
function initDataFromShim(body: string): string {
  const match = /var data = ("[\s\S]*?");/.exec(body);
  return match ? (JSON.parse(match[1]) as string) : "";
}

/** Чий підпис віддали: id лежить в `initData`, а не в адресі відповіді. */
function userIdFromInitData(initData: string): number | null {
  const raw = new URLSearchParams(initData).get("user");
  if (!raw) return null;
  const user = JSON.parse(raw) as { id?: unknown };
  return typeof user.id === "number" ? user.id : null;
}
