import { DatabaseRepository } from "../../core/database.repository";
import { withAutoMigrate } from "../../core/database/auto-migrate";

export class UserRepository extends DatabaseRepository {
  /**
   * Читаємо юзера. SELECT * повертає ВСІ існуючі колонки.
   */
  async getUser(userId: number): Promise<any> {
    return await this.db.prepare(`SELECT * FROM users WHERE user_id = ?`).bind(userId).first<any>();
  }

  /**
   * Створюємо новий рядок (тільки базові поля з 0001_init.sql).
   */
  async createUser(user: {
    user_id: number;
    first_name: string;
    last_name: string;
    username: string;
    language: string;
  }): Promise<void> {
    const now = new Date().toISOString();

    await this.db
      .prepare(
        `
        INSERT INTO users (user_id, first_name, last_name, username, language, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      )
      .bind(user.user_id, user.first_name, user.last_name, user.username, user.language, now)
      .run();
  }

  /**
   * Оновлюємо ВСІ поля з ctx.user (крім user_id).
   * Автоматично створює відсутні колонки!
   */
  async updateUser(userId: number, updates: Record<string, any>): Promise<void> {
    const keys = Object.keys(updates);
    if (keys.length === 0) return;

    const setClause = keys.map((k) => `${k} = ?`).join(", ");
    const values = keys.map((k) => updates[k]);

    await withAutoMigrate(
      this.db,
      async () => {
        await this.db
          .prepare(`UPDATE users SET ${setClause} WHERE user_id = ?`)
          .bind(...values, userId)
          .run();
      },
      updates,
      "users", // ← ЯВНО вказуємо таблицю
    );
  }
}
