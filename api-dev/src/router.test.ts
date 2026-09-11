import { describe, it, expect } from "vitest";
import { handleRequest, ADMIN_PATH_PREFIXES } from "./router";
import { ADMIN_COOKIE_NAME, signSessionToken } from "@wwwuabot/shared/security/session";
import type { Env } from "./shared/types";

/**
 * Регресійні тести адмін-гейта — хребта безпеки api-dev.
 *
 * Гейт — це єдина річ, що відділяє адмін-дії від публічного URL `api-dev`.
 * До 11.09.2026 він протікав у трьох місцях (§5.4): секрети в заголовках
 * `X-Admin-Secret` / `X-Bot-Token` авторизували `/db-proxy` та легасі
 * вебхук-ендпоїнти в обхід cookie-сесії. Ці тести фіксують межу, щоб вона
 * не протекла знову.
 *
 * @module api-dev/src/router.test
 */

const ADMIN_SECRET = "test-admin-secret";

/** Реальний маршрут під кожним адмін-префіксом. */
const ADMIN_ROUTES: Record<(typeof ADMIN_PATH_PREFIXES)[number], string> = {
  "/api/admin/": "/api/admin/sites",
  "/api/portal/": "/api/portal/scenarios/list",
  "/api/bot/": "/api/bot/webhook-info",
};

// ── Fixtures ──────────────────────────────────────────────────────

/**
 * Заглушка D1: відповідає на будь-який SQL порожнім результатом.
 * Гейт перевіряється до звернення до БД, тому цього досить.
 */
function fakeStatement(): D1PreparedStatement {
  const statement = {
    bind: () => statement,
    first: async () => null,
    all: async () => ({ results: [] }),
    run: async () => ({ meta: { changes: 0 } }),
  } as unknown as D1PreparedStatement;
  return statement;
}

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    DB: { prepare: () => fakeStatement() } as unknown as D1Database,
    CONTENT_KV: {
      get: async () => null,
      put: async () => undefined,
      delete: async () => undefined,
    } as unknown as KVNamespace,
    ADMIN_SECRET,
    // Налаштований, щоб відмова в ідентичності була саме 401 (немає підпису),
    // а не 503 (воркер не сконфігурований) — інакше тест не розрізняє причин.
    BOT_TOKEN: "123456:TEST-BOT-TOKEN",
    ...overrides,
  };
}

async function call(
  method: string,
  path: string,
  env: Env = makeEnv(),
  headers: Record<string, string> = {},
): Promise<Response> {
  return handleRequest(
    new Request(`https://api.example.com${path}`, {
      method,
      headers: new Headers(headers),
    }),
    env,
  );
}

function cookieHeader(token: string): Record<string, string> {
  return { Cookie: `${ADMIN_COOKIE_NAME}=${token}` };
}

/** Підписує сесію тим самим секретом, що бачить воркер. */
async function validToken(secret = ADMIN_SECRET): Promise<string> {
  return signSessionToken(`admin:${Date.now() + 60_000}`, secret);
}

// ── Адмін-гейт ────────────────────────────────────────────────────

describe("адмін-гейт", () => {
  it("кожен адмін-префікс віддає 401 без сесії", async () => {
    for (const prefix of ADMIN_PATH_PREFIXES) {
      const res = await call("GET", ADMIN_ROUTES[prefix]);
      expect(res.status, `${prefix} мусить вимагати сесію`).toBe(401);
    }
  });

  it("⛔ НЕ пропускає підроблену cookie (підпис іншим секретом)", async () => {
    const forged = await validToken("wrong-secret");
    for (const prefix of ADMIN_PATH_PREFIXES) {
      const res = await call("GET", ADMIN_ROUTES[prefix], makeEnv(), cookieHeader(forged));
      expect(res.status, `${prefix} з підробленою cookie`).toBe(401);
    }
  });

  it("⛔ НЕ пропускає протерміновану cookie", async () => {
    const expired = await signSessionToken("admin:1", ADMIN_SECRET);
    const res = await call("GET", "/api/admin/sites", makeEnv(), cookieHeader(expired));
    expect(res.status).toBe(401);
  });

  it("⛔ НЕ пропускає сміттєвий токен", async () => {
    // Саме ASCII: HTTP-заголовки — ByteString, кирилиця там неможлива.
    const res = await call("GET", "/api/admin/sites", makeEnv(), cookieHeader("garbage"));
    expect(res.status).toBe(401);
  });

  it("⛔ закритий, а не відкритий, якщо ADMIN_SECRET не налаштований", async () => {
    const env = makeEnv({ ADMIN_SECRET: undefined });
    const res = await call("GET", "/api/admin/sites", env, cookieHeader(await validToken()));
    expect(res.status).toBe(401);
  });

  it("⛔ НЕ приймає секрет у заголовку (регресія §5.4)", async () => {
    const res = await call("GET", "/api/admin/sites", makeEnv(), {
      "X-Admin-Secret": ADMIN_SECRET,
      "X-Bot-Token": "anything",
    });
    expect(res.status).toBe(401);
  });

  it("пропускає далі з валідною cookie", async () => {
    const res = await call("GET", "/api/admin/sites", makeEnv(), cookieHeader(await validToken()));
    expect(res.status).not.toBe(401);
  });
});

// ── Видалені легасі-поверхні (§5.4) ───────────────────────────────

describe("видалені легасі-ендпоїнти", () => {
  const removed: Array<[string, string]> = [
    ["POST", "/db-proxy"],
    ["GET", "/setup-webhook"],
    ["GET", "/webhook-info"],
  ];

  it.each(removed)("⛔ %s %s лишається 404 (навіть із валідною cookie)", async (method, path) => {
    const res = await call(method, path, makeEnv(), cookieHeader(await validToken()));
    expect(res.status).toBe(404);
  });

  it("⛔ легасі-ендпоїнти недосяжні з секретом у заголовку", async () => {
    const res = await call("POST", "/db-proxy", makeEnv(), {
      "X-Admin-Secret": ADMIN_SECRET,
    });
    expect(res.status).toBe(404);
  });
});

// ── Публічні та користувацькі маршрути ────────────────────────────

describe("публічні маршрути не зачеплені гейтом", () => {
  it("GET /health відкритий", async () => {
    expect((await call("GET", "/health")).status).toBe(200);
  });

  it("GET /api/catalog відкритий", async () => {
    expect((await call("GET", "/api/catalog")).status).not.toBe(401);
  });
});

describe("користувацькі маршрути вимагають initData", () => {
  it("⛔ GET /api/sites — 401 без підписаного initData", async () => {
    expect((await call("GET", "/api/sites")).status).toBe(401);
  });

  it("⛔ GET /api/my-dates — 401 без підписаного initData", async () => {
    expect((await call("GET", "/api/my-dates")).status).toBe(401);
  });
});
