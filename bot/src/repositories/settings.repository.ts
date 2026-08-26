import { DatabaseRepository } from "../core/database.repository";
import { withAutoMigrate } from "../core/database/auto-migrate";
import { log } from "../shared/utils/debug";

export class SettingsRepository extends DatabaseRepository {
  /**
   * Отримує значення з таблиці settings за ключем колонки.
   * Автоматично створює колонку якщо її немає.
   *
   * @param key - Назва колонки (наприклад, "group_admin", "group_galyashop")
   * @returns Значення колонки або null
   */
  async getValue(key: string): Promise<string | null> {
    try {
      const row = await withAutoMigrate(
        this.db,
        async () => {
          return await this.db.prepare(`SELECT ${key} FROM settings LIMIT 1`).first<any>();
        },
        { [key]: "" }, // Зразок для визначення типу (TEXT)
        "settings",
      );

      if (!row || row[key] === undefined || row[key] === null) {
        log("SETTINGS", "value not found", { key });
        return null;
      }

      return String(row[key]);
    } catch (err) {
      log("SETTINGS", "failed to get value", { key, error: String(err) });
      return null;
    }
  }

  /**
   * Отримує chat_id для групи за ключем.
   *
   * @param groupKey - Ключ групи (наприклад, "group_admin", "group_galyashop")
   * @returns Chat ID або null
   */
  async getChatId(groupKey: string): Promise<string | null> {
    return await this.getValue(groupKey);
  }

  /**
   * Ініціалізує таблицю settings з базовими полями.
   * Викликається один раз при першому запуску.
   */
  async initialize(): Promise<void> {
    try {
      // Перевіряємо чи таблиця існує
      const testQuery = await this.db
        .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='settings'`)
        .first();

      if (!testQuery) {
        log("SETTINGS", "creating settings table");
        await this.db.prepare(`CREATE TABLE settings (id INTEGER PRIMARY KEY DEFAULT 1)`).run();
      }

      // Забезпечуємо наявність базових колонок
      await withAutoMigrate(
        this.db,
        async () => {
          await this.db.prepare(`INSERT OR IGNORE INTO settings (id) VALUES (1)`).run();
        },
        { bot_active: 1, group_admin: "" },
        "settings",
      );

      log("SETTINGS", "initialized");
    } catch (err) {
      log("SETTINGS", "initialization failed", { error: String(err) });
    }
  }
}
