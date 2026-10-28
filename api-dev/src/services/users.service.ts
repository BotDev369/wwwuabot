import { withAutoMigrate } from "@wwwuabot/shared/database/auto-migrate";
import type { Env } from "../shared/types";

const SAFE_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const PROTECTED_USERS = new Set(["user_id"]);

export class UsersService {
  constructor(private env: Env) {}

  /** Гарантує динамічну колонку блокування через спільний механізм D1. */
  private async ensureIsBlocked(): Promise<void> {
    await withAutoMigrate(
      this.env.DB,
      () => this.env.DB.prepare("SELECT is_blocked FROM users LIMIT 0").first(),
      { is_blocked: 0 },
      "users",
    );
  }

  /** Отримати список користувачів (без важких JSON колонок на зразок my_dates). */
  async listUsers(): Promise<Record<string, unknown>[]> {
    try {
      await this.ensureIsBlocked();
      const result = await this.env.DB.prepare(
        "SELECT user_id, first_name, last_name, username, language, created_at, is_blocked FROM users ORDER BY user_id ASC",
      ).all<Record<string, unknown>>();
      return result.results ?? [];
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("no such table")) return [];
      throw error;
    }
  }

  /**
   * Прочитати запис користувача за user_id.
   *
   * `SELECT *` тут дозволено: це **один** рядок за ключем, а профіль показує
   * аватар із `telegram_json` — без цієї колонки картка порожніє. Списки
   * читають переліченими колонками (зразок — `services/messages/peers.ts`);
   * стереже `check:db`.
   */
  async readUser(userId: number): Promise<Record<string, unknown> | null> {
    await this.ensureIsBlocked();
    const row = await this.env.DB.prepare("SELECT * FROM users WHERE user_id = ?")
      .bind(userId)
      .first<Record<string, unknown>>();
    return row ?? null;
  }

  /** Оновити наявні поля користувача; нові колонки оголошуються в реєстрі D1. */
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

    await withAutoMigrate(
      this.env.DB,
      async () => {
        const setClause = keys.map((key) => `${key} = ?`).join(", ");
        const values = keys.map((key) => fields[key]);
        await this.env.DB.prepare(`UPDATE users SET ${setClause} WHERE user_id = ?`)
          .bind(...values, userId)
          .run();
      },
      fields,
      "users",
    );
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
    const current = await this.env.DB.prepare("SELECT is_blocked FROM users WHERE user_id = ?")
      .bind(userId)
      .first<{ is_blocked: number }>();
    const wasBlocked = current?.is_blocked === 1;

    await this.env.DB.prepare("UPDATE users SET is_blocked = ? WHERE user_id = ?")
      .bind(blockedVal, userId)
      .run();

    if (wasBlocked !== blocked) {
      await this.notifyBlockChange(userId, blocked);
    }
  }

  /** Масові операції (delete, block, unblock). */
  async bulkUsers(action: "delete" | "block" | "unblock", ids: number[]): Promise<number> {
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
      await this.ensureIsBlocked();
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

      const result = await this.env.DB.prepare(
        `UPDATE users SET is_blocked = ? WHERE user_id IN (${placeholders})`,
      )
        .bind(val, ...ids)
        .run();
      return result.meta?.changes ?? 0;
    }

    return 0;
  }

  /** Надіслати пряме повідомлення користувачеві в Telegram. */
  async sendUserMessage(userId: number, text: string): Promise<void> {
    if (!this.env.BOT_TOKEN) {
      throw new Error("BOT_TOKEN not configured");
    }

    const tgRes = await fetch(`https://api.telegram.org/bot${this.env.BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: userId,
        text,
      }),
    });

    const tgData = (await tgRes.json()) as { ok?: boolean; description?: string };
    if (!tgData.ok) {
      throw new Error(tgData.description ?? "Telegram API error");
    }
  }

  /** Сповіщення про блокування або розблокування акаунту через сценарій або fallback. */
  private async notifyBlockChange(userId: number, isNowBlocked: boolean): Promise<void> {
    if (!this.env.BOT_TOKEN) return;

    const slug = isNowBlocked ? "blocked" : "unblocked";
    const fallbackText = isNowBlocked
      ? "⚠️ Ваш акаунт заблоковано."
      : "✅ Ваш акаунт розблоковано.";

    let captionText = fallbackText;
    let buttons: unknown[][] = [];
    let photoUrl = "";

    try {
      const row = await this.env.DB.prepare("SELECT * FROM scenarios WHERE slug = ?")
        .bind(slug)
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
        await this.env.DB.prepare("UPDATE users SET active_scenario = NULL WHERE user_id = ?")
          .bind(userId)
          .run();
      } catch {
        // ігноруємо
      }
    }

    try {
      if (photoUrl) {
        const res = await fetch(`https://api.telegram.org/bot${this.env.BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: userId,
            photo: photoUrl,
            caption: captionText,
            parse_mode: "HTML",
            reply_markup: buttons.length > 0 ? { inline_keyboard: buttons } : undefined,
          }),
        });
        if (!res.ok) {
          await fetch(`https://api.telegram.org/bot${this.env.BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: userId, text: captionText }),
          });
        }
      } else {
        await fetch(`https://api.telegram.org/bot${this.env.BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: userId, text: captionText }),
        });
      }
    } catch {
      // Telegram API недоступний — ігноруємо
    }
  }
}
