import type { Env } from "../shared/types";
import { withAutoMigrate } from "../shared/auto-migrate";

export interface UserProfileDto {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  language?: string | null;
  role: string;
  tariff: string;
  status: string;
  discount: number;
  permissions: string[];
}

const SAFE_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const PROTECTED_USERS = new Set(["user_id"]);

export class UsersService {
  constructor(private env: Env) {}

  /** Гарантує наявність колонки is_blocked. */
  async ensureIsBlocked(): Promise<void> {
    await this.env.DB
      .prepare("ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0")
      .run()
      .catch(() => {});
  }

  /** Отримати список користувачів (без важких JSON колонок на зразок my_dates). */
  async listUsers(): Promise<Record<string, unknown>[]> {
    await this.ensureIsBlocked();
    try {
      const result = await this.env.DB.prepare(
        "SELECT user_id, first_name, last_name, username, language, created_at, is_blocked FROM users ORDER BY user_id ASC",
      ).all();

      return (result.results ?? []).map((row: Record<string, unknown>) => {
        const copy = { ...row };
        delete copy.my_dates;
        return copy;
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("no such table")) {
        return [];
      }
      throw e;
    }
  }

  /** Прочитати запис користувача за user_id. */
  async readUser(userId: number): Promise<Record<string, unknown> | null> {
    await this.ensureIsBlocked();
    const row = await this.env.DB.prepare("SELECT * FROM users WHERE user_id = ?")
      .bind(userId)
      .first<Record<string, unknown>>();
    return row ?? null;
  }

  /** Оновити поля користувача з авто-міграцією відсутніх колонок. */
  async updateUser(userId: number, body: Record<string, unknown>): Promise<void> {
    const fields: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (PROTECTED_USERS.has(key)) continue;
      if (!SAFE_RE.test(key)) continue;
      fields[key] = value;
    }

    const keys = Object.keys(fields);
    if (keys.length === 0) {
      throw new Error("no fields to update");
    }

    try {
      const setClause = keys.map((k) => `${k} = ?`).join(", ");
      const values = keys.map((k) => fields[k]);
      await this.env.DB.prepare(`UPDATE users SET ${setClause} WHERE user_id = ?`)
        .bind(...values, userId)
        .run();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("no such column")) {
        const match = msg.match(/no such column: (\w+)/);
        if (match && fields[match[1]] !== undefined) {
          const colName = match[1];
          const type = typeof fields[colName] === "number" ? "INTEGER" : "TEXT";
          await this.env.DB.prepare(
            `ALTER TABLE users ADD COLUMN ${colName} ${type} DEFAULT NULL`,
          ).run();
          const setClause2 = keys.map((k) => `${k} = ?`).join(", ");
          const values2 = keys.map((k) => fields[k]);
          await this.env.DB.prepare(
            `UPDATE users SET ${setClause2} WHERE user_id = ?`,
          )
            .bind(...values2, userId)
            .run();
          return;
        }
      }
      throw e;
    }
  }

  /** Видалити користувача за user_id. */
  async deleteUser(userId: number): Promise<boolean> {
    const result = await this.env.DB.prepare("DELETE FROM users WHERE user_id = ?")
      .bind(userId)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  /** Заблокувати або розблокувати користувача зі сповіщенням через Telegram. */
  async blockUser(userId: number, blocked: boolean): Promise<void> {
    await this.ensureIsBlocked();
    const blockedVal = blocked ? 1 : 0;
    try {
      const current = await this.env.DB.prepare(
        "SELECT is_blocked FROM users WHERE user_id = ?",
      )
        .bind(userId)
        .first<{ is_blocked: number }>();
      const wasBlocked = current?.is_blocked === 1;

      await this.env.DB.prepare("UPDATE users SET is_blocked = ? WHERE user_id = ?")
        .bind(blockedVal, userId)
        .run();

      if (wasBlocked !== blocked) {
        await this.notifyBlockChange(userId, blocked);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("no such column: is_blocked")) {
        await this.env.DB.prepare(
          "ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0",
        ).run();
        await this.env.DB.prepare("UPDATE users SET is_blocked = ? WHERE user_id = ?")
          .bind(blockedVal, userId)
          .run();
        await this.notifyBlockChange(userId, blocked);
        return;
      }
      throw e;
    }
  }

  /** Масові операції (delete, block, unblock). */
  async bulkUsers(action: "delete" | "block" | "unblock", ids: number[]): Promise<number> {
    await this.ensureIsBlocked();
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => "?").join(",");

    if (action === "delete") {
      const result = await this.env.DB.prepare(
        `DELETE FROM users WHERE user_id IN (${placeholders})`,
      )
        .bind(...ids)
        .run();
      return result.meta?.changes ?? 0;
    }

    if (action === "block" || action === "unblock") {
      const val = action === "block" ? 1 : 0;
      const isNowBlocked = action === "block";

      for (const userId of ids) {
        try {
          const current = await this.env.DB.prepare(
            "SELECT is_blocked FROM users WHERE user_id = ?",
          )
            .bind(userId)
            .first<{ is_blocked: number }>();
          const wasBlocked = current?.is_blocked === 1;
          if (wasBlocked !== isNowBlocked) {
            await this.notifyBlockChange(userId, isNowBlocked);
          }
        } catch {
          // ігноруємо помилки перевірки статусу окремого юзера
        }
      }

      try {
        const result = await this.env.DB.prepare(
          `UPDATE users SET is_blocked = ? WHERE user_id IN (${placeholders})`,
        )
          .bind(val, ...ids)
          .run();
        return result.meta?.changes ?? 0;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        if (msg.includes("no such column: is_blocked")) {
          await this.env.DB.prepare(
            "ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0",
          ).run();
          const result = await this.env.DB.prepare(
            `UPDATE users SET is_blocked = ? WHERE user_id IN (${placeholders})`,
          )
            .bind(val, ...ids)
            .run();
          return result.meta?.changes ?? 0;
        }
        throw e;
      }
    }

    return 0;
  }

  /** Надіслати пряме повідомлення користувачеві в Telegram. */
  async sendUserMessage(userId: number, text: string): Promise<void> {
    if (!this.env.BOT_TOKEN) {
      throw new Error("BOT_TOKEN not configured");
    }

    const tgRes = await fetch(
      `https://api.telegram.org/bot${this.env.BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: userId,
          text,
        }),
      },
    );

    const tgData = (await tgRes.json()) as { ok?: boolean; description?: string };
    if (!tgData.ok) {
      throw new Error(tgData.description ?? "Telegram API error");
    }
  }

  /** Отримати профіль користувача для conditional rendering. */
  async getUserProfile(userId: number): Promise<UserProfileDto | null> {
    const row = await withAutoMigrate(
      this.env.DB,
      () =>
        this.env.DB.prepare(
          `SELECT user_id, first_name, last_name, username, language,
                  role, tariff, status, discount, permissions
           FROM users WHERE user_id = ?`,
        )
          .bind(userId)
          .first<Record<string, unknown>>(),
      { role: "user", tariff: "free", status: "active", discount: 0, permissions: "[]" },
      "users",
    );

    if (!row) return null;

    let permissions: string[] = [];
    if (typeof row.permissions === "string" && row.permissions) {
      try {
        const parsed = JSON.parse(row.permissions);
        if (Array.isArray(parsed)) permissions = parsed;
      } catch {
        permissions = row.permissions
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      }
    }

    return {
      id: Number(row.user_id),
      firstName: (row.first_name as string) ?? null,
      lastName: (row.last_name as string) ?? null,
      username: (row.username as string) ?? null,
      language: (row.language as string) ?? null,
      role: (row.role as string) ?? "user",
      tariff: (row.tariff as string) ?? "free",
      status: (row.status as string) ?? "active",
      discount: Number(row.discount ?? 0),
      permissions,
    };
  }

  /** Сповіщення про блокування або розблокування акаунту через сценарій або fallback. */
  private async notifyBlockChange(userId: number, isNowBlocked: boolean): Promise<void> {
    if (!this.env.BOT_TOKEN) return;

    const codeword = isNowBlocked ? "blocked" : "unblocked";
    const fallbackText = isNowBlocked
      ? "⚠️ Ваш акаунт заблоковано."
      : "✅ Ваш акаунт розблоковано.";

    let captionText = fallbackText;
    let buttons: unknown[][] = [];
    let photoUrl = "";

    try {
      const row = await this.env.DB.prepare(
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
      // Якщо БД недоступна — fallback
    }

    if (!isNowBlocked) {
      try {
        await this.env.DB.prepare(
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
          `https://api.telegram.org/bot${this.env.BOT_TOKEN}/sendPhoto`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: userId,
              photo: photoUrl,
              caption: captionText,
              parse_mode: "HTML",
              reply_markup:
                buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
            }),
          },
        );
        if (!res.ok) {
          await fetch(
            `https://api.telegram.org/bot${this.env.BOT_TOKEN}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: userId, text: captionText }),
            },
          );
        }
      } else {
        await fetch(
          `https://api.telegram.org/bot${this.env.BOT_TOKEN}/sendMessage`,
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
}
