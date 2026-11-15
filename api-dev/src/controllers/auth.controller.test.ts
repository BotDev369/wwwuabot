/**
 * Межа входу адміна: **що вважається спробою**.
 *
 * Пароль — рядок. `{"password": 123}` або `null` не є спробою входу, тож таке
 * тіло відпадає до порівняння й **не** збільшує лічильник спроб: інакше можна
 * було б «витратити» чи обійти ліміт без пароля. Справжня невдача — рядок, але
 * не той — лишається `401` і рахується, як раніше.
 *
 * @module api-dev/src/controllers/auth.controller.test
 */

import { describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";
import { handleAuthCheck, handleLogin } from "./auth.controller";
import { signSessionToken } from "@wwwuabot/shared/security/session";

const SECRET = "пароль-адміна";

function makeEnv(): {
  env: Env;
  kv: { put: ReturnType<typeof vi.fn>; get: ReturnType<typeof vi.fn> };
} {
  const kv = { put: vi.fn(), get: vi.fn(async () => null), delete: vi.fn() };
  return { env: { ADMIN_SECRET: SECRET, CONTENT_KV: kv } as unknown as Env, kv };
}

function request(body: unknown): Request {
  return new Request("https://api.example.com/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": "1.2.3.4" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

// ── Розбір тіла ───────────────────────────────────────────────────

describe("⛔ тіло, з яким ми не працюємо", () => {
  it("не-об'єкт у тілі відкидає розбір, а не порівняння пароля", async () => {
    const { env, kv } = makeEnv();
    const res = await handleLogin(request(`"пароль"`), env);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid body" });
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("число замість пароля не рахується спробою входу", async () => {
    const { env, kv } = makeEnv();
    const res = await handleLogin(request({ password: 123 }), env);

    expect(res.status).toBe(400);
    expect(kv.put).not.toHaveBeenCalled();
  });
});

// ── Справжня невдача ──────────────────────────────────────────────

describe("спроба з паролем", () => {
  it("невірний пароль — це 401 і лічильник спроб", async () => {
    const { env, kv } = makeEnv();
    const res = await handleLogin(request({ password: "не той" }), env);

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Invalid password" });
    expect(kv.put).toHaveBeenCalledWith("login-attempts:1.2.3.4", "1", expect.anything());
  });

  it("вірний пароль чистить лічильник і видає сесію", async () => {
    const { env, kv } = makeEnv();
    const res = await handleLogin(request({ password: SECRET }), env);

    expect(res.status).toBe(200);
    expect(res.headers.get("Set-Cookie")).toContain("admin_session=");
    expect(kv.put).not.toHaveBeenCalled();
  });
});

// ── Другий вхід: Buffy ───────────────────────────────────────────

describe("вхід Buffy", () => {
  const BUFFY = "пароль-столу";

  function withBuffy(): Env {
    const kv = { put: vi.fn(), get: vi.fn(async () => null), delete: vi.fn() };
    return { ADMIN_SECRET: SECRET, DESK_BUFFY_SECRET: BUFFY, CONTENT_KV: kv } as unknown as Env;
  }

  it("її пароль видає окрему cookie, а не адмінську", async () => {
    const res = await handleLogin(request({ password: BUFFY }), withBuffy());

    expect(res.status).toBe(200);
    const cookie = res.headers.get("Set-Cookie") ?? "";
    expect(cookie).toContain("desk_session=");
    expect(cookie).not.toContain("admin_session=");
    expect(await res.json()).toEqual({ ok: true, side: "buffy" });
  });

  it("адмінський пароль лишає адмінську сесію", async () => {
    const res = await handleLogin(request({ password: SECRET }), withBuffy());
    expect(res.headers.get("Set-Cookie")).toContain("admin_session=");
  });

  it("без налаштованого пароля столу другого входу немає", async () => {
    const { env } = makeEnv();
    const res = await handleLogin(request({ password: BUFFY }), env);
    expect(res.status).toBe(401);
  });

  it("два входи не збігаються: пароль столу не пускає в панель", async () => {
    const res = await handleLogin(request({ password: SECRET }), withBuffy());
    expect(res.headers.get("Set-Cookie")).not.toContain("desk_session=");
  });
});

describe("стан сесії", () => {
  it("каже, чий це вхід — від цього залежить меню", async () => {
    const buffyToken = await signSessionToken(`buffy:${Date.now() + 60_000}`, "пароль-адміна");
    const { env } = makeEnv();
    const res = await handleAuthCheck(
      new Request("https://api.example.com/auth/check", {
        headers: { Cookie: `desk_session=${buffyToken}` },
      }),
      env,
    );

    const body = (await res.json()) as { authenticated: boolean; side: string };
    expect(body.authenticated).toBe(true);
    expect(body.side).toBe("buffy");
  });
});
