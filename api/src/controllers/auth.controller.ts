/**
 * Контролер cookie-based авторизації для web-admin.
 *
 * Перенесено з `web-admin/worker.ts` в api/ (задача Фази 3).
 * Використовує HMAC SHA-256 для підпису токенів.
 *
 * web-admin/worker.ts надалі відповідає лише за:
 * 1. SPA fallback (віддача index.html для не-asset маршрутів)
 * 2. Перевірку cookie перед проксюванням до api/
 */

import type { Env } from "../shared/types";

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 годин

// ── Helpers ───────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

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

async function signToken(
  payload: string,
  secret: string,
): Promise<string> {
  const key = await getKey(secret);
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(payload),
  );
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${payload}.${sigHex}`;
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

/** Перевіряє наявність валідного admin cookie. */
export async function isAuthenticated(
  request: Request,
  env: Env,
): Promise<boolean> {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies[COOKIE_NAME];
  if (!token || !env.ADMIN_SECRET) return false;
  return verifyToken(token, env.ADMIN_SECRET);
}

// ── Handlers ──────────────────────────────────────────────────────

/** GET /auth/debug — тимчасовий debug: чи є ADMIN_SECRET (без розкриття значення). */
export async function handleDebug(env: Env): Promise<Response> {
  const hasSecret = !!env.ADMIN_SECRET;
  const secretLength = env.ADMIN_SECRET?.length ?? 0;
  return json({ hasSecret, secretLength });
}

/** POST /auth/login — створення сесії через пароль. */
export async function handleLogin(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  // DEBUG: показуємо довжину отриманого пароля та довжину секрету
  const pwLen = body.password?.length ?? 0;
  const secretLen = env.ADMIN_SECRET?.length ?? 0;
  const match = body.password === env.ADMIN_SECRET;

  if (!body.password || !match) {
    await new Promise((r) => setTimeout(r, 500));
    return json({ error: "Invalid password", debug: { pwLen, secretLen, match } }, 401);
  }

  const expires = Date.now() + COOKIE_MAX_AGE * 1000;
  const payload = `admin:${expires}`;
  const token = await signToken(payload, env.ADMIN_SECRET!);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": [
        `${COOKIE_NAME}=${token}`,
        "HttpOnly",
        "SameSite=Strict",
        "Path=/",
        `Max-Age=${COOKIE_MAX_AGE}`,
      ].join("; "),
    },
  });
}

/** POST /auth/logout — видалення cookie. */
export async function handleLogout(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
    },
  });
}

/** GET /auth/check — перевірка стану авторизації. */
export async function handleAuthCheck(
  request: Request,
  env: Env,
): Promise<Response> {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies[COOKIE_NAME];
  if (!token || !env.ADMIN_SECRET) {
    return json({ authenticated: false });
  }
  const valid = await verifyToken(token, env.ADMIN_SECRET);
  return json({ authenticated: valid });
}
