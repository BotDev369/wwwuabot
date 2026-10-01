/**
 * Гейт допуску на платформі — тести.
 *
 * Перевіряємо **з боку обходу**: поки правило жило лише в боті, посилання з
 * кнопки «Відкрити сторінку» давало повний продукт людині, якій відмовили в чаті.
 * Тому кожен випадок тут — це спроба дістатися платформи без запрошення, і
 * важливо не лише «закрито», а й **як** відповіли: 401 без підпису (немає
 * ким бути), 403 із підписом (є ким, але не запросили).
 *
 * @module api-dev/src/shared/platform-gate.test
 */

import { describe, expect, it } from "vitest";
import { handleRequest } from "../router";
import { ADMIN_COOKIE_NAME, signSessionToken } from "@wwwuabot/shared/security/session";
import type { Env } from "./types";

const ADMIN_SECRET = "test-admin-secret";
const BOT_TOKEN = "123456:TEST-BOT-TOKEN";

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

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

/** D1, який на `SELECT inviter_id` відповідає заданим значенням. */
function fakeDb(inviterId: number | null | Error): D1Database {
  const statement = {
    bind: () => statement,
    first: async () => {
      if (inviterId instanceof Error) throw inviterId;
      return { inviter_id: inviterId };
    },
    all: async () => ({ results: [] }),
    run: async () => ({ meta: { changes: 0 } }),
  } as unknown as D1PreparedStatement;
  return { prepare: () => statement } as unknown as D1Database;
}

function makeEnv(inviterId: number | null | Error = null): Env {
  return {
    DB: fakeDb(inviterId),
    CONTENT_KV: {
      get: async () => null,
      put: async () => undefined,
      delete: async () => undefined,
    } as unknown as KVNamespace,
    ADMIN_SECRET,
    BOT_TOKEN,
  } as unknown as Env;
}

async function call(
  path: string,
  env: Env,
  headers: Record<string, string> = {},
): Promise<Response> {
  return handleRequest(
    new Request(`https://api.example.com${path}`, { headers: new Headers(headers) }),
    env,
  );
}

/** Запит із тілом — так надсилається повідомлення адміну зі сторінки відмови. */
function post(path: string, env: Env, body: unknown, initData?: string): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (initData) headers["X-Telegram-Init-Data"] = initData;
  return handleRequest(
    new Request(`https://api.example.com${path}`, {
      method: "POST",
      headers: new Headers(headers),
      body: JSON.stringify(body),
    }),
    env,
  );
}

describe("гейт допуску на платформі", () => {
  it("⛔ без підписаного initData платформа закрита (401)", async () => {
    expect((await call("/api/space/users", makeEnv(7))).status).toBe(401);
  });

  it("⛔ ⛔ людина без запрошення не отримує продукт (403)", async () => {
    const initData = await makeInitData(42);
    const res = await call("/api/space/users", makeEnv(null), {
      "X-Telegram-Init-Data": initData,
    });
    expect(res.status).toBe(403);
  });

  it("⛔ збій бази не відкриває закритий продукт", async () => {
    const initData = await makeInitData(42);
    const res = await call("/api/space/users", makeEnv(new Error("D1 down")), {
      "X-Telegram-Init-Data": initData,
    });
    expect(res.status).toBe(403);
  });

  it("запрошена людина проходить далі", async () => {
    const initData = await makeInitData(42);
    const res = await call("/api/space/users", makeEnv(7), {
      "X-Telegram-Init-Data": initData,
    });
    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  it("запит про допуск відкритий і відповідає Allowed", async () => {
    const anonymous = await call("/api/user/access", makeEnv(7));
    expect(anonymous.status).toBe(200);
    expect(await anonymous.json()).toEqual({ allowed: false });

    const invited = await call("/api/user/access", makeEnv(7), {
      "X-Telegram-Init-Data": await makeInitData(42),
    });
    expect(await invited.json()).toEqual({ allowed: true });
  });

  it("медіафайли магазину лишаються відкритими (їх читає <img>)", async () => {
    expect((await call("/api/shop/media/some-key", makeEnv(null))).status).not.toBe(401);
  });

  it("адмін-сесія власника не є обходом", async () => {
    const token = await signSessionToken(`admin:${Date.now() + 60_000}`, ADMIN_SECRET);
    const res = await call("/api/mydate/systems", makeEnv(null), {
      Cookie: `${ADMIN_COOKIE_NAME}=${token}`,
    });
    expect(res.status).not.toBe(403);
  });

  it("повідомлення адміну приймається без допуску, але з підписом", async () => {
    const initData = await makeInitData(42);
    const res = await post(
      "/api/user/access-request",
      makeEnv(null),
      { text: "Питання щодо платформи" },
      initData,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("⛔ без підпису повідомлення адміну не приймається", async () => {
    const res = await post("/api/user/access-request", makeEnv(null), {
      text: "Питання щодо платформи",
    });
    expect(res.status).toBe(401);
  });

  it("⛔ ⛔ порожнє повідомлення не пише рядок у базу", async () => {
    const initData = await makeInitData(42);
    for (const body of [{ text: "   " }, {}]) {
      const res = await post("/api/user/access-request", makeEnv(null), body, initData);
      expect(res.status).toBe(400);
    }
  });

  it("health не проходить гейт (його опитує монітор без підпису)", async () => {
    expect((await call("/health", makeEnv(null))).status).toBe(200);
  });
});
