/**
 * Контролер cookie-based авторизації для web-admin.
 *
 * HMAC-логіка живе в `@wwwuabot/shared/security/session` — спільному модулі,
 * який використовує і `web-admin-dev/src/worker.ts`. Тут лишається тільки те,
 * що специфічне для api-dev: перевірка пароля, rate-limit, видача cookie.
 *
 * @module api-dev/src/controllers/auth.controller
 */

import type { Env } from "../shared/types";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  buildClearedSessionCookie,
  buildSessionCookie,
  hasValidSession,
  parseCookies,
  sessionExpiresAt,
  signSessionToken,
  verifySessionToken,
} from "@wwwuabot/shared/security/session";

/** Ліміт невдалих спроб входу з однієї IP за вікно LOGIN_WINDOW_SECONDS. */
const LOGIN_MAX_ATTEMPTS = 10;
const LOGIN_WINDOW_SECONDS = 15 * 60;

// ── Helpers ───────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Перевіряє наявність валідного admin cookie. */
export async function isAuthenticated(
  request: Request,
  env: Env,
): Promise<boolean> {
  return hasValidSession(request, env.ADMIN_SECRET);
}

/** Кількість невдалих спроб входу з цієї IP у поточному вікні. */
async function failedAttempts(env: Env, key: string): Promise<number> {
  const stored = await env.CONTENT_KV.get(key);
  return stored ? Number(stored) || 0 : 0;
}

// ── Handlers ──────────────────────────────────────────────────────

/** POST /auth/login — створення сесії через пароль. */
export async function handleLogin(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const secret = env.ADMIN_SECRET;
  if (!secret) {
    return json({ error: "Admin auth not configured" }, 503);
  }

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const rateKey = `login-attempts:${ip}`;
  const attempts = await failedAttempts(env, rateKey);
  if (attempts >= LOGIN_MAX_ATTEMPTS) {
    return json({ error: "Too many attempts, try again later" }, 429);
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  if (!body.password || body.password !== secret) {
    await env.CONTENT_KV.put(rateKey, String(attempts + 1), {
      expirationTtl: LOGIN_WINDOW_SECONDS,
    });
    return json({ error: "Invalid password" }, 401);
  }

  await env.CONTENT_KV.delete(rateKey);

  const token = await signSessionToken(
    `admin:${sessionExpiresAt()}`,
    secret,
  );

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildSessionCookie(token, ADMIN_SESSION_TTL_SECONDS),
    },
  });
}

/** POST /auth/logout — видалення cookie. */
export async function handleLogout(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildClearedSessionCookie(),
    },
  });
}

/** GET /auth/check — перевірка стану авторизації. */
export async function handleAuthCheck(
  request: Request,
  env: Env,
): Promise<Response> {
  const token = parseCookies(request.headers.get("Cookie"))[ADMIN_COOKIE_NAME];
  if (!token || !env.ADMIN_SECRET) {
    return json({ authenticated: false });
  }
  const valid = await verifySessionToken(token, env.ADMIN_SECRET);
  return json({ authenticated: valid });
}
