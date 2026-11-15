/**
 * Контролер cookie-based авторизації для web-admin.
 *
 * HMAC-логіка живе в `@wwwuabot/shared/security/session` — спільному модулі,
 * який використовує і `web-admin-dev/src/worker.ts`. Тут лишається тільки те,
 * що специфічне для api-dev: перевірка пароля, rate-limit, видача cookie.
 *
 * @module api-dev/src/controllers/auth.controller
 */

import { z } from "zod";
import type { Env } from "../shared/types";
import { readBody } from "../shared/body";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_TTL_SECONDS,
  DESK_COOKIE_NAME,
  DESK_PAYLOAD_PREFIX,
  DESK_SESSION_TTL_SECONDS,
  buildClearedDeskSessionCookie,
  buildClearedSessionCookie,
  buildDeskSessionCookie,
  buildSessionCookie,
  hasValidSession,
  parseCookies,
  sessionExpiresAt,
  sessionSide,
  sessionTokenExpiresAt,
  signSessionToken,
} from "@wwwuabot/shared/security/session";

/**
 * Пароль — **рядок**. `password: 123` або `null` не є паролем, тож таке тіло
 * відпадає до порівняння; лічильник спроб цього не рахує, бо спроба з паролем
 * тут не починалася. Справжня невдача (є рядок, але не той) лишається `401` і
 * збільшує лічильник — як і раніше.
 */
const loginBody = z.object({ password: z.string() });

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
export async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  return hasValidSession(request, env.ADMIN_SECRET);
}

/** Кількість невдалих спроб входу з цієї IP у поточному вікні. */
async function failedAttempts(env: Env, key: string): Promise<number> {
  const stored = await env.CONTENT_KV.get(key);
  return stored ? Number(stored) || 0 : 0;
}

// ── Handlers ──────────────────────────────────────────────────────

/** POST /auth/login — створення сесії через пароль. */
export async function handleLogin(request: Request, env: Env): Promise<Response> {
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

  const parsed = await readBody(request, loginBody);
  if (!parsed.ok) return parsed.response;

  // Пароль Buffy — окремий секрет і окрема cookie: вона входить тим самим
  // екраном, але дістає лише стіл. Порівнюємо обидва варіанти до лічильника
  // невдач, щоб друга спроба не виглядала як перша.
  const buffySecret = env.DESK_BUFFY_SECRET;
  const isAdmin = parsed.body.password === secret;
  const isBuffy = Boolean(buffySecret) && parsed.body.password === buffySecret;

  if (!isAdmin && !isBuffy) {
    await env.CONTENT_KV.put(rateKey, String(attempts + 1), {
      expirationTtl: LOGIN_WINDOW_SECONDS,
    });
    return json({ error: "Invalid password" }, 401);
  }

  await env.CONTENT_KV.delete(rateKey);

  if (isBuffy) {
    const deskToken = await signSessionToken(
      `${DESK_PAYLOAD_PREFIX}${sessionExpiresAt(DESK_SESSION_TTL_SECONDS)}`,
      secret,
    );
    return new Response(JSON.stringify({ ok: true, side: "buffy" }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": buildDeskSessionCookie(deskToken, DESK_SESSION_TTL_SECONDS),
      },
    });
  }

  const token = await signSessionToken(`admin:${sessionExpiresAt()}`, secret);

  return new Response(JSON.stringify({ ok: true, side: "serhii" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildSessionCookie(token, ADMIN_SESSION_TTL_SECONDS),
    },
  });
}

/** POST /auth/logout — гасить обидва входи: чужий cookie не лишається жити. */
export async function handleLogout(): Promise<Response> {
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append("Set-Cookie", buildClearedSessionCookie());
  headers.append("Set-Cookie", buildClearedDeskSessionCookie());
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

/**
 * GET /auth/check — перевірка стану авторизації.
 *
 * Разом зі станом віддає `expiresAt`: це той самий факт про **власну** сесію
 * запитувача, тож показувати його в профілі панелі можна, не розкриваючи
 * нічого зайвого. Термін береться лише з перевіреного токена.
 */
export async function handleAuthCheck(request: Request, env: Env): Promise<Response> {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const side = await sessionSide(request, env.ADMIN_SECRET);
  if (!side) return json({ authenticated: false, side: null, expiresAt: null });

  const token = side === "buffy" ? cookies[DESK_COOKIE_NAME] : cookies[ADMIN_COOKIE_NAME];
  return json({
    authenticated: true,
    side,
    expiresAt: token ? sessionTokenExpiresAt(token) : null,
  });
}
