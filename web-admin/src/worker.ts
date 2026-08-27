/// <reference types="@cloudflare/workers-types" />

import { formatSqliteDatetime } from "./shared/datetime.js";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  ADMIN_SECRET: string;
  BOT_TOKEN?: string;
}

const COOKIE_NAME = "admin_session";
const COOKIE_MAX_AGE = 60 * 60 * 8;

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

async function signToken(payload: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  const sigHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${payload}.${sigHex}`;
}

async function verifyToken(token: string, secret: string): Promise<boolean> {
  const lastDot = token.lastIndexOf(".");
  if (lastDot === -1) return false;
  const payload = token.slice(0, lastDot);
  const sigHex = token.slice(lastDot + 1);
  const key = await getKey(secret);
  const enc = new TextEncoder();
  const sigBytes = new Uint8Array(sigHex.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const valid = await crypto.subtle.verify("HMAC", key, sigBytes, enc.encode(payload));
  if (!valid) return false;
  const [, expiresStr] = payload.split(":");
  const expires = parseInt(expiresStr, 10);
  if (Date.now() > expires) return false;
  return true;
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((c) => {
      const [k, ...v] = c.trim().split("=");
      return [k.trim(), v.join("=")];
    }),
  );
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleLogin(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  let body: { password?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.password || body.password !== env.ADMIN_SECRET) {
    await new Promise((r) => setTimeout(r, 500));
    return json({ error: "Invalid password" }, 401);
  }
  const expires = Date.now() + COOKIE_MAX_AGE * 1000;
  const payload = `admin:${expires}`;
  const token = await signToken(payload, env.ADMIN_SECRET);
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

async function handleLogout(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
    },
  });
}

async function handleAuthCheck(request: Request, env: Env): Promise<Response> {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies[COOKIE_NAME];
  if (!token) return json({ authenticated: false });
  const valid = await verifyToken(token, env.ADMIN_SECRET);
  return json({ authenticated: valid });
}

async function isAuthenticated(request: Request, env: Env): Promise<boolean> {
  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies[COOKIE_NAME];
  if (!token) return false;
  return verifyToken(token, env.ADMIN_SECRET);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/auth/login") return handleLogin(request, env);
    if (url.pathname === "/auth/logout") return handleLogout();
    if (url.pathname === "/auth/check") return handleAuthCheck(request, env);

    const authed = await isAuthenticated(request, env);
    if (!authed) {
      if (url.pathname.startsWith("/api/")) {
        return json({ error: "Unauthorized" }, 401);
      }
      return env.ASSETS.fetch(new Request(new URL("/", url).toString(), request));
    }

    if (url.pathname.startsWith("/api/")) {
      if (url.pathname === "/api/scenarios/read" && request.method === "POST") {
        let body: { codeword?: string };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        if (!body.codeword) return json({ error: "codeword required" }, 400);
        const row = await env.DB.prepare("SELECT * FROM scenarios WHERE codeword = ?")
          .bind(body.codeword)
          .first();
        return json({ success: true, data: row ?? null });
      }

      if (url.pathname === "/api/scenarios/write" && request.method === "POST") {
        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const codeword = typeof body.codeword === "string" ? body.codeword.trim() : "";
        if (!codeword) return json({ error: "codeword required" }, 400);

        const now = formatSqliteDatetime();

        // Збираємо ЛИШЕ безпечні, не-службові поля — оновлюємо тільки те, що передано.
        const SAFE_COLUMN_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        const PROTECTED = new Set(["codeword", "created_at", "updated_at"]);
        const fields: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(body)) {
          if (PROTECTED.has(key)) continue;
          if (!SAFE_COLUMN_NAME_RE.test(key)) continue;
          fields[key] = value === "" ? null : value;
        }
        const keys = Object.keys(fields);
        if (keys.length === 0) return json({ error: "no fields to update" }, 400);

        // UPSERT: немає рядка → створити; є → оновити ЛИШЕ передані колонки,
        // решта (photo_url, buttons, caption_*) лишаються недоторканими.
        const columns = ["codeword", ...keys, "updated_at"];
        const placeholders = columns.map(() => "?").join(", ");
        const setClause = [
          ...keys.map((k) => `${k} = excluded.${k}`),
          "updated_at = excluded.updated_at",
        ].join(", ");
        const values: unknown[] = [codeword, ...keys.map((k) => fields[k]), now];

        await env.DB.prepare(
          `INSERT INTO scenarios (${columns.join(", ")}) VALUES (${placeholders})
         ON CONFLICT(codeword) DO UPDATE SET ${setClause}`,
        )
          .bind(...(values as (string | number | boolean | null)[]))
          .run();

        return json({ success: true, codeword, updated_at: now });
      }

      if (url.pathname === "/api/scenarios/list" && request.method === "GET") {
        // Дешевий aggregate для ETag: кількість + останнє оновлення.
        const meta = await env.DB.prepare(
          "SELECT COUNT(*) AS c, MAX(updated_at) AS m FROM scenarios",
        ).first<{ c: number; m: string | null }>();
        const etag = `"${meta?.c ?? 0}-${meta?.m ?? ""}"`;

        // Умовний запит: якщо список не змінився — 304 без тіла.
        if (request.headers.get("If-None-Match") === etag) {
          return new Response(null, { status: 304, headers: { ETag: etag } });
        }

        // Інакше повний список, сортований A–Z, без важких buttons/rich_data.
        const result = await env.DB.prepare("SELECT * FROM scenarios ORDER BY codeword ASC").all();
        const items = (result.results ?? []).map((row: Record<string, unknown>) => {
          const copy = { ...(row as Record<string, unknown>) };
          delete copy.buttons;
          delete copy.rich_data;
          return copy;
        });

        return new Response(JSON.stringify({ success: true, items }), {
          status: 200,
          headers: { "Content-Type": "application/json", ETag: etag },
        });
      }

      if (url.pathname === "/api/scenarios/delete" && request.method === "POST") {
        let body: { codeword?: string };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const codeword = typeof body.codeword === "string" ? body.codeword.trim() : "";
        if (!codeword) return json({ error: "codeword required" }, 400);
        const result = await env.DB.prepare("DELETE FROM scenarios WHERE codeword = ?")
          .bind(codeword)
          .run();
        const deleted = (result.meta?.changes ?? 0) > 0;
        return json({ success: true, deleted, codeword });
      }

      // ──────────────── USERS API ────────────────
      // Wrapped in try-catch: D1 may throw if table/columns don't exist yet.

      if (url.pathname === "/api/users/list" && request.method === "GET") {
        try {
          const result = await env.DB.prepare("SELECT * FROM users ORDER BY user_id ASC").all();
          const items = (result.results ?? []).map((row: Record<string, unknown>) => {
            const copy = { ...row };
            delete copy.my_dates;
            return copy;
          });
          return json({ success: true, items });
        } catch (e: any) {
          const msg = e?.message || String(e);
          if (msg.includes("no such table")) {
            return json({ success: true, items: [] });
          }
          return json({ error: msg }, 500);
        }
      }

      if (url.pathname === "/api/users/read" && request.method === "POST") {
        let body: { user_id?: number };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        if (!body.user_id) return json({ error: "user_id required" }, 400);
        try {
          const row = await env.DB.prepare("SELECT * FROM users WHERE user_id = ?")
            .bind(body.user_id)
            .first();
          return json({ success: true, data: row ?? null });
        } catch (e: any) {
          return json({ error: e?.message || "DB error" }, 500);
        }
      }

      if (url.pathname === "/api/users/update" && request.method === "POST") {
        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const userId = typeof body.user_id === "number" ? body.user_id : parseInt(String(body.user_id), 10);
        if (!userId || isNaN(userId)) return json({ error: "user_id required" }, 400);

        const SAFE_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
        const PROTECTED = new Set(["user_id"]);
        const fields: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(body)) {
          if (PROTECTED.has(key)) continue;
          if (!SAFE_RE.test(key)) continue;
          fields[key] = value;
        }
        const keys = Object.keys(fields);
        if (keys.length === 0) return json({ error: "no fields to update" }, 400);

        try {
          const setClause = keys.map((k) => `${k} = ?`).join(", ");
          const values = keys.map((k) => fields[k]);
          await env.DB.prepare(`UPDATE users SET ${setClause} WHERE user_id = ?`)
            .bind(...values, userId)
            .run();
          return json({ success: true });
        } catch (e: any) {
          const msg = e?.message || String(e);
          if (msg.includes("no such column")) {
            // Column doesn't exist — try creating it via ALTER TABLE
            const match = msg.match(/no such column: (\w+)/);
            if (match && fields[match[1]] !== undefined) {
              const colName = match[1];
              const type = typeof fields[colName] === "number" ? "INTEGER" : "TEXT";
              await env.DB.prepare(`ALTER TABLE users ADD COLUMN ${colName} ${type} DEFAULT NULL`).run();
              // Retry
              const setClause2 = keys.map((k) => `${k} = ?`).join(", ");
              const values2 = keys.map((k) => fields[k]);
              await env.DB.prepare(`UPDATE users SET ${setClause2} WHERE user_id = ?`)
                .bind(...values2, userId)
                .run();
              return json({ success: true });
            }
          }
          return json({ error: msg }, 500);
        }
      }

      if (url.pathname === "/api/users/delete" && request.method === "POST") {
        let body: { user_id?: number };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        if (!body.user_id) return json({ error: "user_id required" }, 400);
        try {
          const result = await env.DB.prepare("DELETE FROM users WHERE user_id = ?")
            .bind(body.user_id)
            .run();
          return json({ success: true, deleted: (result.meta?.changes ?? 0) > 0 });
        } catch (e: any) {
          return json({ error: e?.message || "DB error" }, 500);
        }
      }

      if (url.pathname === "/api/users/block" && request.method === "POST") {
        let body: { user_id?: number; blocked?: boolean };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        if (!body.user_id) return json({ error: "user_id required" }, 400);
        try {
          const blocked = body.blocked !== false ? 1 : 0;
          await env.DB.prepare("UPDATE users SET is_blocked = ? WHERE user_id = ?")
            .bind(blocked, body.user_id)
            .run();
          return json({ success: true });
        } catch (e: any) {
          const msg = e?.message || String(e);
          if (msg.includes("no such column: is_blocked")) {
            await env.DB.prepare("ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0").run();
            const blocked = body.blocked !== false ? 1 : 0;
            await env.DB.prepare("UPDATE users SET is_blocked = ? WHERE user_id = ?")
              .bind(blocked, body.user_id)
              .run();
            return json({ success: true });
          }
          return json({ error: msg }, 500);
        }
      }

      if (url.pathname === "/api/users/bulk" && request.method === "POST") {
        let body: { action?: string; ids?: number[] };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        const action = body.action;
        const ids = Array.isArray(body.ids) ? body.ids : [];
        if (!action || ids.length === 0) return json({ error: "action and ids required" }, 400);

        try {
          let processed = 0;
          if (action === "delete") {
            const placeholders = ids.map(() => "?").join(",");
            const result = await env.DB.prepare(`DELETE FROM users WHERE user_id IN (${placeholders})`)
              .bind(...ids)
              .run();
            processed = result.meta?.changes ?? 0;
          } else if (action === "block" || action === "unblock") {
            const val = action === "block" ? 1 : 0;
            const placeholders = ids.map(() => "?").join(",");
            const result = await env.DB.prepare(`UPDATE users SET is_blocked = ? WHERE user_id IN (${placeholders})`)
              .bind(val, ...ids)
              .run();
            processed = result.meta?.changes ?? 0;
          } else {
            return json({ error: `Unknown action: ${action}` }, 400);
          }
          return json({ success: true, processed });
        } catch (e: any) {
          const msg = e?.message || String(e);
          if (msg.includes("no such column: is_blocked")) {
            await env.DB.prepare("ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0").run();
            const val = action === "block" ? 1 : 0;
            const placeholders = ids.map(() => "?").join(",");
            const result = await env.DB.prepare(`UPDATE users SET is_blocked = ? WHERE user_id IN (${placeholders})`)
              .bind(val, ...ids)
              .run();
            return json({ success: true, processed: result.meta?.changes ?? 0 });
          }
          return json({ error: msg }, 500);
        }
      }

      if (url.pathname === "/api/users/message" && request.method === "POST") {
        if (!env.BOT_TOKEN) return json({ error: "BOT_TOKEN not configured" }, 500);
        let body: { user_id?: number; text?: string };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400);
        }
        if (!body.user_id || !body.text) return json({ error: "user_id and text required" }, 400);

        try {
          const tgRes = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: body.user_id, text: body.text }),
          });
          const tgData = (await tgRes.json()) as { ok?: boolean; description?: string };
          if (!tgData.ok) {
            return json({ error: tgData.description ?? "Telegram API error" }, 502);
          }
          return json({ success: true });
        } catch (e: any) {
          return json({ error: e?.message || "Failed to send message" }, 500);
        }
      }

      return json({ error: "Not found" }, 404);
    }

    // SPA-fallback: маршрути без розширення (/editor, /scenarios) → index.html,
    // щоб F5 і прямі посилання працювали. Ассети з розширенням → чесний 404.
    const assetRes = await env.ASSETS.fetch(request);
    if (assetRes.status === 404 && !url.pathname.includes(".")) {
      return env.ASSETS.fetch(new Request(new URL("/", url).toString(), request));
    }
    return assetRes;
  },
};
