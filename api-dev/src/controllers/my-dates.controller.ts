import type { Env } from "../shared/types";
import { VALID_TYPES } from "../shared/constants";
import { formatSqliteDatetime } from "../shared/datetime";
import { withAutoMigrate } from "../shared/auto-migrate";
import { apiLog } from "../shared/logger";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ── Migrate old date formats ────────────────────────────────────────

function migrateDates(dates: any[]): { dates: any[]; needsMigration: boolean } {
  let needsMigration = false;

  const migrated = dates.map((d: any) => {
    // alias/category → name/type/tags
    if (d.name === undefined && (d.alias || d.category)) {
      needsMigration = true;
      return {
        ...d,
        type: (VALID_TYPES as readonly string[]).includes(d.type) ? d.type : "other",
        name: d.name || d.alias || "",
        tags: Array.isArray(d.tags) ? (d.tags as string[]) : d.category ? [d.category] : [],
        created_at: d.created_at || formatSqliteDatetime(),
        updated_at: d.updated_at || d.created_at || formatSqliteDatetime(),
      };
    }
    // Invalid type → "other"
    if (d.name !== undefined && !(VALID_TYPES as readonly string[]).includes(d.type)) {
      needsMigration = true;
      return { ...d, type: "other" };
    }
    // Empty tags → restore from category
    if (
      d.name !== undefined &&
      (!Array.isArray(d.tags) || d.tags.length === 0) &&
      d.category
    ) {
      needsMigration = true;
      return { ...d, tags: [d.category] };
    }
    return d;
  });

  return { dates: migrated, needsMigration };
}

// ── Read user's dates ───────────────────────────────────────────────

async function readUserDates(
  db: D1Database,
  userId: number,
): Promise<{ dates: any[]; needsMigration: boolean }> {
  const user = await db.prepare("SELECT * FROM users WHERE user_id = ?").bind(userId).first();
  if (!user) return { dates: [], needsMigration: false };

  let dates: any[] = [];
  try {
    const raw = (user as any).my_dates;
    if (raw && typeof raw === "string") {
      const parsed = JSON.parse(raw);
      dates = Array.isArray(parsed.items) ? parsed.items : [];
    } else if (raw && typeof raw === "object" && Array.isArray((raw as any).items)) {
      dates = (raw as any).items;
    }
  } catch {
    dates = [];
  }

  return migrateDates(dates);
}

// ── Save dates back to user ─────────────────────────────────────────

async function saveUserDates(
  db: D1Database,
  userId: number,
  dates: any[],
): Promise<void> {
  await db
    .prepare("UPDATE users SET my_dates = ? WHERE user_id = ?")
    .bind(JSON.stringify({ items: dates }), userId)
    .run();
}

// ── Extract user_id from header ─────────────────────────────────────

function extractUserId(request: Request): { ok: true; userId: number } | { ok: false; response: Response } {
  const userIdStr = request.headers.get("X-Telegram-User-Id");
  if (!userIdStr) {
    return { ok: false, response: json({ ok: false, error: "X-Telegram-User-Id header required" }, 401) };
  }
  const userId = parseInt(userIdStr, 10);
  if (isNaN(userId)) {
    return { ok: false, response: json({ ok: false, error: "Invalid user_id" }, 401) };
  }
  return { ok: true, userId };
}

// ── Main handler ────────────────────────────────────────────────────

export async function handleMyDates(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    // Guarantee my_dates column exists
    await withAutoMigrate(
      env.DB,
      async () => {
        await env.DB.prepare("SELECT my_dates FROM users LIMIT 1").all();
      },
      { my_dates: null },
      "users",
    );

    const userResult = extractUserId(request);
    if (!userResult.ok) return userResult.response;
    const { userId } = userResult;

    // Read + migrate
    const { dates, needsMigration } = await readUserDates(env.DB, userId);

    // Auto-create user if missing
    if (dates.length === 0 && needsMigration === false) {
      const exists = await env.DB.prepare("SELECT 1 FROM users WHERE user_id = ?").bind(userId).first();
      if (!exists) {
        await env.DB.prepare(
          "INSERT INTO users (user_id, first_name, last_name, username, language) VALUES (?, '...', '...', '...', '...')",
        )
          .bind(userId)
          .run();
      }
    }

    // Persist migrated data
    if (needsMigration && dates.length > 0) {
      await saveUserDates(env.DB, userId, dates);
    }

    // ── GET ──
    if (request.method === "GET") {
      return json({ ok: true, dates });
    }

    // ── POST (add) ──
    if (request.method === "POST") {
      let body: any;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "Invalid JSON" }, 400);
      }
      const { date, type, name, tags, notes, alias, category } = body;
      if (!date) return json({ ok: false, error: "date is required" }, 400);

      const now = formatSqliteDatetime();
      const newDate = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        user_id: userId,
        date,
        type: (VALID_TYPES as readonly string[]).includes(type) ? type : "other",
        name: name || alias || "",
        tags: Array.isArray(tags) ? tags : category ? [category] : [],
        notes: notes || "",
        created_at: now,
        updated_at: now,
      };
      dates.push(newDate);

      await saveUserDates(env.DB, userId, dates);
      return json({ ok: true, id: newDate.id });
    }

    // ── PUT (update) ──
    if (request.method === "PUT") {
      let body: any;
      try {
        body = await request.json();
      } catch {
        return json({ ok: false, error: "Invalid JSON" }, 400);
      }
      const { id, date, type, name, tags, notes, alias, category } = body;
      if (!id) return json({ ok: false, error: "id is required" }, 400);
      if (!date) return json({ ok: false, error: "date is required" }, 400);

      const idx = dates.findIndex((d: any) => d.id === id);
      if (idx === -1) return json({ ok: false, error: "Not found" }, 404);

      const existingTags = dates[idx].tags || [];
      const incomingTags = Array.isArray(tags) ? tags : category ? [category] : undefined;
      const finalTags =
        incomingTags && incomingTags.length > 0
          ? incomingTags
          : existingTags.length > 0
            ? existingTags
            : [];

      dates[idx] = {
        ...dates[idx],
        date,
        type: (VALID_TYPES as readonly string[]).includes(type) ? type : dates[idx].type || "other",
        name: name || alias || dates[idx].name || "",
        tags: finalTags,
        notes: notes || "",
        updated_at: formatSqliteDatetime(),
      };

      await saveUserDates(env.DB, userId, dates);
      return json({ ok: true });
    }

    // ── DELETE ──
    if (request.method === "DELETE") {
      const url = new URL(request.url);
      const id = url.searchParams.get("id");
      const ids = url.searchParams.get("ids");
      if (!id && !ids) return json({ ok: false, error: "id or ids required" }, 400);

      const toDelete = ids ? ids.split(",").filter(Boolean) : [id!];
      const filtered = dates.filter((d: any) => !toDelete.includes(d.id));
      if (filtered.length === dates.length) return json({ ok: false, error: "Not found" }, 404);

      await saveUserDates(env.DB, userId, filtered);
      return json({ ok: true, deleted: toDelete.length });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e: any) {
    apiLog.error("My-dates error", e);
    return json({ ok: false, error: e?.message ?? "Unknown error" }, 500);
  }
}
