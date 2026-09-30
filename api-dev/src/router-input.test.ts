/**
 * Поганий ввід мусить виглядати як помилка клієнта (400), а не як збій сервера
 * (500).
 *
 * `/api/scenario/%` і `/api/mydate/analysis/%zz` зривали `decodeURIComponent`,
 * виняток вилітав із воркера — і сміттєвий запит (сканер, обрізане посилання,
 * битий `encodeURIComponent` у клієнті) створював помилку в Sentry та
 * споживав безкоштовну квоту. Тут фіксується саме різниця між 400 і 500.
 *
 * Адмін-гейт і легасі-поверхні — в `router.test.ts`.
 *
 * @module api-dev/src/router-input.test
 */

import { describe, expect, it } from "vitest";
import { handleRequest } from "./router";
import type { Env } from "./shared/types";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";

/** D1, що відповідає на запит допуску: людина запрошена (див. `access.test.ts`). */
const statement = {
  bind: () => statement,
  first: async () => ({ inviter_id: 7 }),
  all: async () => ({ results: [] }),
  run: async () => ({ meta: { changes: 0 } }),
} as unknown as D1PreparedStatement;

/**
 * `env` не порожній: гейт допуску (`shared/access.ts`) стоїть **перед**
 * маршрутизацією, тож без `BOT_TOKEN` і рядка `users` запит зупинився б на 503
 * і жодного кодування не розбирав би — тобто тест перестав би перевіряти те,
 * що описано в заголовку файлу.
 */
const env = {
  BOT_TOKEN,
  DB: { prepare: () => statement } as unknown as D1Database,
} as unknown as Env;

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

/** Підписаний `initData` — той самий HMAC, що перевіряє `shared/identity.ts`. */
async function makeInitData(userId: number): Promise<string> {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Тест" }),
  });
  const checkString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), BOT_TOKEN);
  params.set("hash", toHex(await hmac(secret, checkString)));
  return params.toString();
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function call(path: string, headers: Record<string, string> = {}): Promise<Response> {
  return handleRequest(
    new Request(`https://api.example.com${path}`, { headers: new Headers(headers) }),
    env,
  );
}

/** Запит від людини, яка має допуск: гейт не відволікає від маршрутизації. */
async function callAsInvited(path: string): Promise<Response> {
  return call(path, { "X-Telegram-Init-Data": await makeInitData(42) });
}

describe("бите кодування в шляху", () => {
  it("GET /api/scenario/% → 400", async () => {
    expect((await callAsInvited("/api/scenario/%")).status).toBe(400);
  });

  it("GET /api/scenario/%zz → 400", async () => {
    expect((await callAsInvited("/api/scenario/%zz")).status).toBe(400);
  });

  it("GET /api/mydate/analysis/% → 400", async () => {
    expect((await callAsInvited("/api/mydate/analysis/%")).status).toBe(400);
  });
});

describe("звичайні відповіді не змінилися", () => {
  it("невідомий шлях → 404", async () => {
    expect((await call("/nope")).status).toBe(404);
  });

  it("GET /health → 200 навіть без біндингів", async () => {
    expect((await call("/health")).status).toBe(200);
  });
});
