/**
 * Воркер адмінки: де сесія справді вирішує, а де — ні.
 *
 * Головна пастка, яку тримають ці тести: прибравши перевірку з документів,
 * легко прибрати її й з `/api/*` — і тоді панель віддала б дані без cookie,
 * поки `api-dev` вважає, що його вже перевірили.
 *
 * @module web-admin-dev/src/worker.test
 */

import { describe, expect, it, vi } from "vitest";
import {
  ADMIN_COOKIE_NAME,
  sessionExpiresAt,
  signSessionToken,
} from "@wwwuabot/shared/security/session";

import worker, { type Env } from "./worker";

const SECRET = "test-secret";

function harness() {
  const assets = vi.fn(
    async () =>
      new Response("<!doctype html><div id=root></div>", {
        headers: { "Content-Type": "text/html" },
      }),
  );
  const api = vi.fn(async () => Response.json({ ok: true }));
  const env = {
    ASSETS: { fetch: assets },
    API: { fetch: api },
    ADMIN_SECRET: SECRET,
  } as unknown as Env;
  return { env, assets, api };
}

async function sessionCookie(): Promise<string> {
  // Підписник і перевірник мусять бачити той самий термін дії: без числа в
  // payload `verifySessionToken` вважає токен вічним і відкидає його.
  const token = await signSessionToken(`admin:${sessionExpiresAt()}`, SECRET);
  return `${ADMIN_COOKIE_NAME}=${token}`;
}

describe("воркер адмінки: документ", () => {
  it("віддає SPA без сесії й не смикає API", async () => {
    const { env, api, assets } = harness();

    const response = await worker.fetch(new Request("https://admin.test/users"), env);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain("id=root");
    expect(api).not.toHaveBeenCalled();
    expect(assets).toHaveBeenCalledOnce();
    expect(response.headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("не підміняє документом відсутній файл", async () => {
    const { env } = harness();
    const assets = vi.fn(async () => new Response("нема", { status: 404 }));
    const env404 = { ...env, ASSETS: { fetch: assets } } as unknown as Env;

    const response = await worker.fetch(new Request("https://admin.test/staryj.js"), env404);

    expect(response.status).toBe(404);
  });
});

describe("воркер адмінки: API", () => {
  it("без cookie — 401 і жодного походу в api-dev", async () => {
    const { env, api } = harness();

    const response = await worker.fetch(
      new Request("https://admin.test/api/admin/users/list"),
      env,
    );

    expect(response.status).toBe(401);
    expect(api).not.toHaveBeenCalled();
  });

  it("з підписаною сесією — проксі до api-dev", async () => {
    const { env, api } = harness();
    const request = new Request("https://admin.test/api/admin/users/list", {
      headers: { Cookie: await sessionCookie() },
    });

    const response = await worker.fetch(request, env);

    expect(response.status).toBe(200);
    expect(api).toHaveBeenCalledOnce();
  });
});

describe("воркер адмінки: /auth/check", () => {
  it("без сесії каже «не авторизовано» без походу в api-dev", async () => {
    const { env, api } = harness();

    const response = await worker.fetch(new Request("https://admin.test/auth/check"), env);

    expect(await response.json()).toEqual({ authenticated: false });
    expect(api).not.toHaveBeenCalled();
  });
});
