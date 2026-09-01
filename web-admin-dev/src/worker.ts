/// <reference types="@cloudflare/workers-types" />

/**
 * web-admin Worker — тонкий проксі до API.
 *
 * Після рефакторингу (Фаза 3) всі API-ендпоїнти знаходяться в api/.
 * Цей воркер відповідає лише за:
 * 1. Перевірку cookie-авторизації
 * 2. Проксювання /api/* та /auth/* запитів до api/ воркера (через service binding)
 * 3. SPA fallback (віддача index.html для не-asset маршрутів)
 *
 * Структура src/ (React-додаток) залишається незмінною —
 * він імпортує з @wwwuabot/shared та використовує ті самі компоненти.
 */

export interface Env {
  ASSETS: Fetcher;
  API: Fetcher;
  DB: D1Database;
  ADMIN_SECRET: string;
  BOT_TOKEN?: string;
}

// ── Auth helpers (cookie-based) ───────────────────────────────────

const COOKIE_NAME = "admin_session";

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function verifyToken(
  token: string,
  secret: string,
): Promise<boolean> {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const sigHex = token.slice(lastDot + 1);
  const key = await getKey(secret);
  const enc = new TextEncoder();
  const sigBytes = new Uint8Array(
    sigHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)),
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    enc.encode(payload),
  );
  if (!valid) return false;
  const [, expiresStr] = payload.split(":");
  const expires = parseInt(expiresStr, 10);
  if (Date.now() > expires) return false;
  return true;
}

function parseCookies(
  header: string | null,
): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k.trim(), v.join("=")];
    }),
  );
}

async function isAuthenticated(
  request: Request,
  env: Env,
): Promise<boolean> {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies[COOKIE_NAME];
  if (!token || !env.ADMIN_SECRET) return false;
  return verifyToken(token, env.ADMIN_SECRET);
}

// ── Asset helpers ─────────────────────────────────────────────────

function fixAssetHeaders(res: Response): Response {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  const ct = headers.get("content-type") || "";
  if (ct.includes("text/html")) {
    headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate",
    );
  }
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Main handler ──────────────────────────────────────────────────

export default {
  async fetch(
    request: Request,
    env: Env,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Auth endpoints — проксюємо до api/ (там обробляються cookie)
    if (
      url.pathname === "/auth/login" ||
      url.pathname === "/auth/logout" ||
      url.pathname === "/auth/check"
    ) {
      const authed = await isAuthenticated(request, env);
      // login/logout працюють без auth (login створює, logout видаляє)
      if (url.pathname === "/auth/check") {
        if (!authed) return json({ authenticated: false });
        return env.API.fetch(request);
      }
      return env.API.fetch(request);
    }

    // Перевірка авторизації для всіх інших запитів
    const authed = await isAuthenticated(request, env);
    if (!authed) {
      if (url.pathname.startsWith("/api/")) {
        return json({ error: "Unauthorized" }, 401);
      }
      // Неавторизовані — віддаємо SPA (React покаже LoginScreen)
      return fixAssetHeaders(
        await env.ASSETS.fetch(
          new Request(
            new URL("/", url).toString(),
            request,
          ),
        ),
      );
    }

    // API запити — проксюємо до api/ воркера
    if (url.pathname.startsWith("/api/")) {
      return env.API.fetch(request);
    }

    // SPA fallback: маршрути без розширення → index.html
    const assetRes = await env.ASSETS.fetch(request);
    if (
      assetRes.status === 404 &&
      !url.pathname.includes(".")
    ) {
      return fixAssetHeaders(
        await env.ASSETS.fetch(
          new Request(
            new URL("/", url).toString(),
            request,
          ),
        ),
      );
    }
    return fixAssetHeaders(assetRes);
  },
};

// 🤖 Qwen AI Agent Test: Direct push to main verified on 01.09.2026
