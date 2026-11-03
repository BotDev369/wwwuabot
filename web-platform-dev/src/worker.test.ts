/**
 * Воркер вебу: 301 на стару адресу й недоторканість асетів.
 *
 * Перевіряємо саме шов, у якому легко помилитись: редирект питають **лише**
 * переходи по документу, і збій `api-dev` не робить сторінку недоступною.
 */

import { describe, expect, it, vi } from "vitest";
import worker, { type Env } from "./worker";

const HTML = { headers: { "Content-Type": "text/html" } };

function harness(answer: () => Promise<Response>) {
  const assets = vi.fn(async () => new Response("<!doctype html><div id=root></div>", HTML));
  const api = vi.fn(answer);
  const env = {
    ASSETS: { fetch: assets },
    API: { fetch: api },
  } as unknown as Env;
  return { env, assets, api };
}

function documentRequest(path: string, init: RequestInit = {}) {
  return new Request(`https://platform.test${path}`, {
    headers: { Accept: "text/html,application/xhtml+xml" },
    ...init,
  });
}

describe("worker: старі адреси", () => {
  it("стара адреса веде 301 на нову й лишає query", async () => {
    const { env, assets } = harness(async () => Response.json({ ok: true, to: "/viruvannia/xxx" }));

    const response = await worker.fetch(documentRequest("/viruvannia-a1?from=chat"), env);

    expect(response.status).toBe(301);
    expect(response.headers.get("Location")).toBe("https://platform.test/viruvannia/xxx?from=chat");
    expect(assets).not.toHaveBeenCalled();
  });

  it("невідома стара адреса не чіпає застосунок", async () => {
    const { env, assets } = harness(async () => Response.json({ ok: true, to: null }));

    const response = await worker.fetch(documentRequest("/zvychaina"), env);

    expect(response.status).toBe(200);
    expect(assets).toHaveBeenCalledOnce();
  });

  it("збій api-dev віддає сторінку, а не помилку", async () => {
    const { env, assets } = harness(async () => new Response("boom", { status: 500 }));

    const response = await worker.fetch(documentRequest("/stara"), env);

    expect(response.status).toBe(200);
    expect(assets).toHaveBeenCalledOnce();
  });

  it("асети не питають редирект", async () => {
    const { env, api } = harness(async () => Response.json({ ok: true, to: "/new" }));

    await worker.fetch(new Request("https://platform.test/assets/index-abc123.js"), env);

    expect(api).not.toHaveBeenCalled();
  });

  it("POST на стару адресу не редиректиться", async () => {
    const { env, api } = harness(async () => Response.json({ ok: true, to: "/new" }));

    await worker.fetch(documentRequest("/stara", { method: "POST", body: "{}" }), env);

    expect(api).not.toHaveBeenCalled();
  });
});
