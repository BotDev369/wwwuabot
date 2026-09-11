/// <reference types="@cloudflare/workers-types" />

/**
 * web-admin Worker — тонка оболонка над API.
 *
 * Обов'язки:
 * 1. Перевірка cookie-сесії — спільна логіка з api-dev
 *    (`@wwwuabot/shared/security/session`), щоб формат токена не міг
 *    розійтися між двома воркерами.
 * 2. Проксювання `/api/*` та `/auth/*` до `api-dev` через service binding.
 * 3. SPA fallback: віддача index.html для не-asset маршрутів.
 *
 * React-додаток у `src/` лишається незмінним.
 *
 * @module web-admin-dev/src/worker
 */

import { hasValidSession } from "@wwwuabot/shared/security/session";

export interface Env {
  ASSETS: Fetcher;
  API: Fetcher;
  ADMIN_SECRET: string;
  BOT_TOKEN?: string;
}

/** Шляхи авторизації, які не потребують попередньої сесії. */
const AUTH_PATHS = new Set(["/auth/login", "/auth/logout", "/auth/check"]);

// ── Helpers ───────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fixAssetHeaders(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  if ((headers.get("content-type") || "").includes("text/html")) {
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

/** Віддає index.html як SPA-фолбек. */
async function serveSpa(url: URL, request: Request, env: Env): Promise<Response> {
  return fixAssetHeaders(
    await env.ASSETS.fetch(new Request(new URL("/", url).toString(), request)),
  );
}

// ── Main handler ──────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const authed = await hasValidSession(request, env.ADMIN_SECRET);

    // /auth/check сам звітує про стан сесії, решта auth-шляхів проходять як є.
    if (AUTH_PATHS.has(url.pathname)) {
      if (url.pathname === "/auth/check" && !authed) {
        return json({ authenticated: false });
      }
      return env.API.fetch(request);
    }

    if (!authed) {
      if (url.pathname.startsWith("/api/")) {
        return json({ error: "Unauthorized" }, 401);
      }
      // Неавторизовані отримують SPA — React покаже LoginScreen.
      return serveSpa(url, request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return env.API.fetch(request);
    }

    // SPA fallback: маршрути без розширення → index.html
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes.status === 404 && !url.pathname.includes(".")) {
      return serveSpa(url, request, env);
    }
    return fixAssetHeaders(assetRes);
  },
};
