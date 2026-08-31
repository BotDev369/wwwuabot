/**
 * Контролер CRUD для таблиці `users`.
 *
 * Перенесено з `web-admin/worker.ts` в api/ (задача Фази 3).
 *
 * Ендпоїнти:
 *   GET  /api/admin/users/list        — список (без важких JSON-колонок)
 *   POST /api/admin/users/read        — прочитати за user_id
 *   POST /api/admin/users/update      — оновити поля
 *   POST /api/admin/users/delete      — видалити
 *   POST /api/admin/users/block       — заблокувати/розблокувати
 *   POST /api/admin/users/bulk        — bulk delete/block/unblock
 *   POST /api/admin/users/message     — надіслати повідомлення через Telegram
 */

import type { Env } from "../shared/types";

// ── Helpers ───────────────────────────────────────────────────────

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** Гарантує наявність колонки is_blocked. */
async function ensureIsBlocked(db: D1Database): Promise<void> {
  await db
    .prepare("ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0")
    .run()
    .catch(() => {});
}

const SAFE_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const PROTECTED_USERS = new Set(["user_id"]);

// ── Telegram notification helper ──────────────────────────────────

async function notifyBlockChange(
  env: Env,
  userId: number,
  isNowBlocked: boolean,
): Promise<void> {
  if (!env.BOT_TOKEN) return;

  const codeword = isNowBlocked ? "blocked" : "unblocked";
  const fallbackText = isNowBlocked
    ? "⚠️ Ваш акаунт заблоковано."
    : "✅ Ваш акаунт розблоковано.";

  let captionText = fallbackText;
  let buttons: unknown[][] = [];
  let photoUrl = "";

  try {
    const row = await env.DB.prepare(
      "SELECT * FROM scenarios WHERE codeword = ?",
    )
      .bind(codeword)
      .first();
    if (row) {
      const r = row as Record<string, unknown>;
      const parts = [r.caption_top, r.caption_mid, r.caption_bot].filter(
        (p): p is string => typeof p === "string" && p.trim() !== "",
      );
      captionText = parts.join("\n───────\n") || fallbackText;
      try {
        buttons = JSON.parse((r.buttons as string) || "[]");
      } catch {
        buttons = [];
      }
      photoUrl = (r.photo_url as string) || "";
    }
  } catch {
    // Якщо БД недоступна — використовуємо fallback
  }

  // Скидаємо active_scenario для розблокованих
  if (!isNowBlocked) {
    try {
      await env.DB.prepare(
        "UPDATE users SET active_scenario = NULL WHERE user_id = ?",
      )
        .bind(userId)
        .run();
    } catch {
      // ігноруємо
    }
  }

  try {
    if (photoUrl) {
      const res = await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: userId,
            photo: photoUrl,
            caption: captionText,
            parse_mode: "HTML",
            reply_markup:
              buttons.length > 0
                ? { inline_keyboard: buttons }
                : undefined,
          }),
        },
      );
      if (!res.ok) {
        await fetch(
          `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: userId, text: captionText }),
          },
        );
      }
    } else {
      await fetch(
        `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: userId, text: captionText }),
        },
      );
    }
  } catch {
    // Telegram API недоступний — ігноруємо
  }
}

// ── Handlers ──────────────────────────────────────────────────────

/** GET /api/admin/users/list — список користувачів. */
export async function handleListUsers(
  _request: Request,
  env: Env,
): Promise<Response> {
  try {
    await ensureIsBlocked(env.DB);
    const result = await env.DB.prepare(
      "SELECT user_id, first_name, last_name, username, language, created_at, is_blocked FROM users ORDER BY user_id ASC",
    ).all();
    const items = (result.results ?? []).map(
      (row: Record<string, unknown>) => {
        const copy = { ...row };
        delete copy.my_dates;
        return copy;
      },
    );
    return json({ success: true, items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("no such table")) {
      return json({ success: true, items: [] });
    }
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/users/read — прочитати користувача. */
export async function handleReadUser(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: { user_id?: number };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.user_id) return json({ error: "user_id required" }, 400);

  try {
    await ensureIsBlocked(env.DB);
    const row = await env.DB.prepare(
      "SELECT * FROM users WHERE user_id = ?",
    )
      .bind(body.user_id)
      .first();
    return json({ success: true, data: row ?? null });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/users/update — оновити поля користувача. */
export async function handleUpdateUser(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const userId =
    typeof body.user_id === "number"
      ? body.user_id
      : parseInt(String(body.user_id), 10);
  if (!userId || isNaN(userId))
    return json({ error: "user_id required" }, 400);

  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (PROTECTED_USERS.has(key)) continue;
    if (!SAFE_RE.test(key)) continue;
    fields[key] = value;
  }
  const keys = Object.keys(fields);
  if (keys.length === 0)
    return json({ error: "no fields to update" }, 400);

  try {
    const setClause = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => fields[k]);
    await env.DB.prepare(`UPDATE users SET ${setClause} WHERE user_id = ?`)
      .bind(...values, userId)
      .run();
    return json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("no such column")) {
      const match = msg.match(/no such column: (\w+)/);
      if (match && fields[match[1]] !== undefined) {
        const colName = match[1];
        const type =
          typeof fields[colName] === "number" ? "INTEGER" : "TEXT";
        await env.DB.prepare(
          `ALTER TABLE users ADD COLUMN ${colName} ${type} DEFAULT NULL`,
        ).run();
        const setClause2 = keys.map((k) => `${k} = ?`).join(", ");
        const values2 = keys.map((k) => fields[k]);
        await env.DB.prepare(
          `UPDATE users SET ${setClause2} WHERE user_id = ?`,
        )
          .bind(...values2, userId)
          .run();
        return json({ success: true });
      }
    }
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/users/delete — видалити користувача. */
export async function handleDeleteUser(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: { user_id?: number };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.user_id) return json({ error: "user_id required" }, 400);

  try {
    const result = await env.DB.prepare(
      "DELETE FROM users WHERE user_id = ?",
    )
      .bind(body.user_id)
      .run();
    return json({
      success: true,
      deleted: (result.meta?.changes ?? 0) > 0,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "DB error";
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/users/block — заблокувати/розблокувати. */
export async function handleBlockUser(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: { user_id?: number; blocked?: boolean };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.user_id) return json({ error: "user_id required" }, 400);

  try {
    await ensureIsBlocked(env.DB);
    const blocked = body.blocked !== false ? 1 : 0;
    const current = await env.DB.prepare(
      "SELECT is_blocked FROM users WHERE user_id = ?",
    )
      .bind(body.user_id)
      .first<{ is_blocked: number }>();
    const wasBlocked = current?.is_blocked === 1;

    await env.DB.prepare(
      "UPDATE users SET is_blocked = ? WHERE user_id = ?",
    )
      .bind(blocked, body.user_id)
      .run();

    if (wasBlocked !== (blocked === 1)) {
      await notifyBlockChange(env, body.user_id, blocked === 1);
    }
    return json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("no such column: is_blocked")) {
      await env.DB.prepare(
        "ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0",
      ).run();
      const blocked = body.blocked !== false ? 1 : 0;
      await env.DB.prepare(
        "UPDATE users SET is_blocked = ? WHERE user_id = ?",
      )
        .bind(blocked, body.user_id)
        .run();
      await notifyBlockChange(env, body.user_id, blocked === 1);
      return json({ success: true });
    }
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/users/bulk — bulk delete/block/unblock. */
export async function handleBulkUsers(
  request: Request,
  env: Env,
): Promise<Response> {
  let body: { action?: string; ids?: number[] };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  const action = body.action;
  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (!action || ids.length === 0)
    return json({ error: "action and ids required" }, 400);

  try {
    await ensureIsBlocked(env.DB);
    let processed = 0;

    if (action === "delete") {
      const placeholders = ids.map(() => "?").join(",");
      const result = await env.DB.prepare(
        `DELETE FROM users WHERE user_id IN (${placeholders})`,
      )
        .bind(...ids)
        .run();
      processed = result.meta?.changes ?? 0;
    } else if (action === "block" || action === "unblock") {
      const val = action === "block" ? 1 : 0;
      const isNowBlocked = action === "block";

      for (const userId of ids) {
        const current = await env.DB.prepare(
          "SELECT is_blocked FROM users WHERE user_id = ?",
        )
          .bind(userId)
          .first<{ is_blocked: number }>();
        const wasBlocked = current?.is_blocked === 1;
        if (wasBlocked !== isNowBlocked) {
          await notifyBlockChange(env, userId, isNowBlocked);
        }
      }

      const placeholders = ids.map(() => "?").join(",");
      const result = await env.DB.prepare(
        `UPDATE users SET is_blocked = ? WHERE user_id IN (${placeholders})`,
      )
        .bind(val, ...ids)
        .run();
      processed = result.meta?.changes ?? 0;
    } else {
      return json({ error: `Unknown action: ${action}` }, 400);
    }

    return json({ success: true, processed });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("no such column: is_blocked")) {
      await env.DB.prepare(
        "ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0",
      ).run();
      const val = action === "block" ? 1 : 0;
      const placeholders = ids.map(() => "?").join(",");
      const result = await env.DB.prepare(
        `UPDATE users SET is_blocked = ? WHERE user_id IN (${placeholders})`,
      )
        .bind(val, ...ids)
        .run();
      return json({
        success: true,
        processed: result.meta?.changes ?? 0,
      });
    }
    return json({ error: msg }, 500);
  }
}

/** POST /api/admin/users/message — надіслати повідомлення через Telegram. */
export async function handleUserMessage(
  request: Request,
  env: Env,
): Promise<Response> {
  if (!env.BOT_TOKEN)
    return json({ error: "BOT_TOKEN not configured" }, 500);

  let body: { user_id?: number; text?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!body.user_id || !body.text)
    return json({ error: "user_id and text required" }, 400);

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: body.user_id,
          text: body.text,
        }),
      },
    );
    const tgData = (await tgRes.json()) as {
      ok?: boolean;
      description?: string;
    };
    if (!tgData.ok) {
      return json(
        { error: tgData.description ?? "Telegram API error" },
        502,
      );
    }
    return json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to send message";
    return json({ error: msg }, 500);
  }
}
