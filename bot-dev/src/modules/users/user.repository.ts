import { DatabaseRepository } from "../../core/database.repository";
import { withAutoMigrate } from "@wwwuabot/shared/database/auto-migrate";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import type { BotUser } from "../../shared/types/env";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
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
   *
   * **Час створення ставить сам `INSERT`.** У живій базі `users.created_at`
   * оголошено `NOT NULL` **без** значення за замовчуванням, тож рядок без
   * нього не створювався: `NOT NULL constraint failed: users.created_at`. Реєстр
   * (`tables.ts`) цього не лікує — `CREATE TABLE IF NOT EXISTS` наявну таблицю не
   * змінює, а констрейнтів він і не переписує. Тому єдине надійне місце — тут:
   * час нового рядка знає той, хто його створює.
   *
   * Передане ззовні значення не перекриваємо: коли рядок створюють із готовою
   * датою, вона й лишається.
   */
  async createUser(userId: number, data: Partial<BotUser> = {}): Promise<void> {
    // Таблицю `users` раніше не створював **ніхто** — вона існувала лише тому,
    // що її колись завели руками в дашборді. На чистій базі перший же новий
    // користувач падав з `no such table`. `INSERT` не обгорнутий
    // `withAutoMigrate`, тож гарантія потрібна саме тут.
    await ensureTables(this.db, ["users"]);

    const row = data.created_at ? data : { ...data, created_at: formatSqliteDatetime() };
    const fields = ["user_id", ...Object.keys(row)];
    const placeholders = fields.map(() => "?").join(", ");
    const values = [userId, ...Object.values(row)];

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
