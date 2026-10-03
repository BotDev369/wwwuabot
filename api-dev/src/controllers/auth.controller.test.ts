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
import { handleLogin } from "./auth.controller";

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
