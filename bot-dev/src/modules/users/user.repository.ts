import { DatabaseRepository } from "../../core/database.repository";
import { withAutoMigrate } from "../../core/database/auto-migrate";
import type { BotUser } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";

export class UserRepository extends DatabaseRepository {
  /**
   * Отримує користувача з БД.
   * Використовує withAutoMigrate для безпечного додавання нових колонок.
   */
  async getUser(userId: number): Promise<BotUser | null> {
    try {
      const user = await withAutoMigrate(
        this.db,
        async () => {
          return await this.db
            .prepare(`SELECT * FROM users WHERE user_id = ?`)
            .bind(userId)
            .first<BotUser>();
        },
        {
          is_blocked: 0,
          rate_limit_json: "",
        },
        "users",
      );
      return user;
    } catch (err) {
      log("USER:repo", "failed to get user", {
        user_id: userId,
        error: String(err),
      });
      return null;
    }
  }

  /**
   * Створює нового користувача.
   */
  async createUser(userId: number, data: Partial<BotUser> = {}): Promise<void> {
    const fields = ["user_id", ...Object.keys(data)];
    const placeholders = fields.map(() => "?").join(", ");
    const values = [userId, ...Object.values(data)];

    await this.db
      .prepare(`INSERT INTO users (${fields.join(", ")}) VALUES (${placeholders})`)
      .bind(...values)
      .run();
  }

  /**
   * Оновлює поля користувача.
   * Використовує withAutoMigrate — якщо колонки немає, вона буде створена.
   */
  async updateUser(userId: number, updates: Record<string, unknown>): Promise<void> {
    if (Object.keys(updates).length === 0) return;

    await withAutoMigrate(
      this.db,
      async () => {
        const setClause = Object.keys(updates)
          .map((k) => `${k} = ?`)
          .join(", ");
        const values = Object.values(updates);

        await this.db
          .prepare(`UPDATE users SET ${setClause} WHERE user_id = ?`)
          .bind(...values, userId)
          .run();
      },
      updates,
      "users",
    );
  }
}
