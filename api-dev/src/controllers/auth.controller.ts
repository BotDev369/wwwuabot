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

/** Парсить hex-рядок у байти; повертає null, якщо рядок не hex. */
function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length === 0 || hex.length % 2 !== 0) return null;
  if (!/^[0-9a-fA-F]+$/.test(hex)) return null;
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function verifyToken(
  token: string,
  secret: string,
): Promise<boolean> {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const sigBytes = hexToBytes(token.slice(lastDot + 1));
  if (!sigBytes) return false;
  const key = await getKey(secret);
  const enc = new TextEncoder();
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    enc.encode(payload),
  );
  if (!valid) return false;
  const [, expiresStr] = payload.split(":");
  const expires = parseInt(expiresStr, 10);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;
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

/** Кількість невдалих спроб входу з цієї IP у поточному вікні. */
async function failedAttempts(env: Env, key: string): Promise<number> {
  const stored = await env.CONTENT_KV.get(key);
  return stored ? Number(stored) || 0 : 0;
}

/** POST /auth/login — створення сесії через пароль. */
export async function handleLogin(
  request: Request,
  env: Env,
): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
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

  if (!body.password || body.password !== env.ADMIN_SECRET) {
    await env.CONTENT_KV.put(rateKey, String(attempts + 1), {
      expirationTtl: LOGIN_WINDOW_SECONDS,
    });
    return json({ error: "Invalid password" }, 401);
  }

  await env.CONTENT_KV.delete(rateKey);

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
        "Secure",
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
      "Set-Cookie": `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
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
