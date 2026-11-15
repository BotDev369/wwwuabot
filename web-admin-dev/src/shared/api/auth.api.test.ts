/**
 * Клієнт входу: чий це бік і що саме їде на сервер.
 *
 * `side` — не косметика: від нього залежить, чи побачить людина меню, чи лише
 * стіл. Тож перевіряємо і відповідь «стіл», і порожню, і те, що вхід/вихід
 * ідуть POST-ом.
 *
 * @module web-admin-dev/src/shared/api/auth.api.test
 */

import { describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({
  seen: [] as Array<{ endpoint: string; body?: unknown; method?: string }>,
  reply: {} as Record<string, unknown>,
}));

vi.mock("./client", () => ({
  apiFetch: async (endpoint: string, options: RequestInit = {}) => {
    calls.seen.push({
      endpoint,
      method: options.method,
      body: options.body ? JSON.parse(String(options.body)) : undefined,
    });
    return calls.reply[endpoint] ?? { authenticated: false, side: null, expiresAt: null };
  },
}));

const { checkAuth, fetchAdminSession, login, logout } = await import("./auth.api");

describe("auth.api", () => {
  it("вхід Buffy видно як `buffy`", async () => {
    calls.reply["/auth/check"] = { authenticated: true, side: "buffy", expiresAt: 123 };
    const session = await fetchAdminSession();
    expect(session).toEqual({ authenticated: true, side: "buffy", expiresAt: 123 });
    expect(await checkAuth()).toBe("buffy");
  });

  it("стара відповідь без `side` читається як адмін", async () => {
    calls.reply["/auth/check"] = { authenticated: true, expiresAt: null };
    expect(await checkAuth()).toBe("serhii");
  });

  it("без входу — `null`, а не вигаданий бік", async () => {
    calls.reply["/auth/check"] = { authenticated: false, side: null, expiresAt: null };
    expect(await checkAuth()).toBeNull();
  });

  it("вхід і вихід — POST із паролем", async () => {
    calls.seen = [];
    await login("пароль");
    await logout();

    expect(calls.seen[0]).toEqual({
      endpoint: "/auth/login",
      method: "POST",
      body: { password: "пароль" },
    });
    expect(calls.seen[1]).toMatchObject({ endpoint: "/auth/logout", method: "POST" });
  });
});
