/**
 * Воркер вебу: 301 на стару адресу й недоторканість асетів.
 *
 * Перевіряємо саме шов, у якому легко помилитись: редирект питають **лише**
 * переходи по документу, і збій `api-dev` не робить сторінку недоступною.
 */

import { describe, expect, it, vi } from "vitest";
import worker, { type Env } from "./worker";

const HTML = { headers: { "Content-Type": "text/html" } };

function harness(answer: () => Promise<Response>, version?: string) {
  const assets = vi.fn(async () => new Response("<!doctype html><div id=root></div>", HTML));
  const api = vi.fn(answer);
  const env = {
    ASSETS: { fetch: assets },
    API: { fetch: api },
    ...(version ? { CF_VERSION_METADATA: { id: version } } : {}),
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

  it("документ без версії веде на адресу з версією деплою", async () => {
    const { env, assets } = harness(async () => Response.json({ ok: true, to: null }), "v42");

    const response = await worker.fetch(documentRequest("/analysis?from=chat"), env);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://platform.test/analysis?from=chat&v=v42");
    expect(assets).not.toHaveBeenCalled();
  });

  it("навігація без Accept теж отримує версію", async () => {
    const { env, assets } = harness(async () => Response.json({ ok: true, to: null }), "v42");

    const response = await worker.fetch(new Request("https://platform.test/analysis"), env);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("https://platform.test/analysis?v=v42");
    expect(assets).not.toHaveBeenCalled();
  });

  it("старі екрани аналізу ведуть у нові розділи", async () => {
    const { env } = harness(async () => Response.json({ ok: true, to: null }), "v42");

    const variants = await worker.fetch(documentRequest("/analysis/variants?from=old"), env);
    const sets = await worker.fetch(documentRequest("/analysis/sets"), env);

    expect(variants.status).toBe(302);
    expect(variants.headers.get("Location")).toBe("https://platform.test/analysis?from=old");
    expect(sets.headers.get("Location")).toBe("https://platform.test/analysis/people");
  });

  it("API з Accept: text/html не отримує версійний редирект", async () => {
    const { env, api, assets } = harness(async () => Response.json({ ok: true, to: null }), "v42");

    const response = await worker.fetch(
      new Request("https://platform.test/api/my-dates", {
        headers: { Accept: "text/html", "X-Telegram-Init-Data": "test" },
      }),
      env,
    );

    expect(response.status).toBe(200);
    expect(api).toHaveBeenCalledOnce();
    expect(assets).not.toHaveBeenCalled();
  });

  it("документ із поточною версією віддає застосунок", async () => {
    const { env, assets } = harness(async () => Response.json({ ok: true, to: null }), "v42");

    const response = await worker.fetch(documentRequest("/analysis?v=v42"), env);

    expect(response.status).toBe(200);
    expect(assets).toHaveBeenCalledOnce();
  });

  it("POST на стару адресу не редиректиться", async () => {
    const { env, api } = harness(async () => Response.json({ ok: true, to: "/new" }));

    await worker.fetch(documentRequest("/stara", { method: "POST", body: "{}" }), env);

    expect(api).not.toHaveBeenCalled();
  });
});
