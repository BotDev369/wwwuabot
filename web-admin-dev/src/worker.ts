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
import { secureResponse } from "@wwwuabot/shared/security/headers";

export interface Env {
  ASSETS: Fetcher;
  API: Fetcher;
  ADMIN_SECRET: string;
  BOT_TOKEN?: string;
}

/** Шляхи авторизації, які не потребують попередньої сесії. */
const AUTH_PATHS = new Set(["/auth/login", "/auth/logout", "/auth/check"]);

// ── Helpers ───────────────────────────────────────────────────────

function json(data: unknown, status = 200, url?: string): Response {
  return secureResponse(
    new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }),
    { url, csp: true },
  );
}

function fixAssetHeaders(res: Response, url: string): Response {
  const headers = new Headers(res.headers);
  if ((headers.get("content-type") || "").includes("text/html")) {
    headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  }
  return secureResponse(
    new Response(res.body, { status: res.status, statusText: res.statusText, headers }),
    { url, csp: true },
  );
}

/** Віддає index.html як SPA-фолбек. */
async function serveSpa(url: URL, request: Request, env: Env): Promise<Response> {
  return fixAssetHeaders(
    await env.ASSETS.fetch(new Request(new URL("/", url).toString(), request)),
    url.toString(),
  );
}

// ── Main handler ──────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    // Усі відповіді нижче йдуть через `json()` / `fixAssetHeaders()` / проксі,
    // тож заголовки накладаються в одному місці кожного з них.

    // Сесію перевіряємо лише там, де від неї залежить рішення. Документ
    // однаковий для всіх: власнику й невідомому віддається той самий
    // `index.html`, а невідому відсіює React (LoginScreen) і гейт `api-dev`
    // на `/api/*`. HMAC на переході по сторінці нічого не змінював.
    const authed =
      url.pathname.startsWith("/api/") || AUTH_PATHS.has(url.pathname)
        ? await hasValidSession(request, env.ADMIN_SECRET)
        : false;

    // /auth/check сам звітує про стан сесії, решта auth-шляхів проходять як є.
    if (AUTH_PATHS.has(url.pathname)) {
      if (url.pathname === "/auth/check" && !authed) {
        return json({ authenticated: false }, 200, url.toString());
      }
      return secureResponse(await env.API.fetch(request), { url: url.toString() });
    }

    if (url.pathname.startsWith("/api/")) {
      if (!authed) return json({ error: "Unauthorized" }, 401, url.toString());
      return secureResponse(await env.API.fetch(request), { url: url.toString() });
    }

    // SPA: маршрут без розширення — це документ (index.html), решта — файл
    // асетів. Документ віддається одразу, без попереднього походу в 404.
    if (!url.pathname.includes(".")) return serveSpa(url, request, env);
    return fixAssetHeaders(await env.ASSETS.fetch(request), url.toString());
  },
};
