import { withAutoMigrate } from "../../core/database/auto-migrate";
import type { Env } from "../../shared/types/env";
import { formatSqliteDatetime } from "../../shared/utils/datetime";

const SAFE_COLUMN_NAME_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export interface DbProxyResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

export class DbProxyService {
  constructor(private env: Env) {}

  async read(codeword: string): Promise<DbProxyResult> {
    const row = await this.env.DB.prepare(`SELECT * FROM scenarios WHERE codeword = ?`)
      .bind(codeword)
      .first();
    return { success: true, data: row ?? null };
  }

  async write(codeword: string, data: Record<string, any>): Promise<DbProxyResult> {
    const now = formatSqliteDatetime();

    const fields: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === "codeword" || key === "created_at" || key === "updated_at") continue;
      if (!SAFE_COLUMN_NAME_RE.test(key)) continue;
      fields[key] = value === "" ? null : value;
    }

    if (!("photo_url" in fields)) fields.photo_url = "";
    if (!("keyboard_type" in fields)) fields.keyboard_type = "static";
    if (!("buttons" in fields)) fields.buttons = "[]";
    if (!("rich_message" in fields)) fields.rich_message = "false"; // ← NEW
    if (!("rich_data" in fields)) fields.rich_data = ""; // ← NEW

    const keys = Object.keys(fields);
    const columns = ["codeword", ...keys, "created_at", "updated_at"];
    const placeholders = columns
      .map((col) =>
        col === "created_at"
          ? `COALESCE((SELECT created_at FROM scenarios WHERE codeword = ?), ?)`
          : "?",
      )
      .join(", ");

    const values: any[] = [codeword];
    for (const k of keys) values.push(fields[k]);
    values.push(codeword);
    values.push(now);
    values.push(now);

    try {
      await withAutoMigrate(
        this.env.DB,
        async () => {
          await this.env.DB.prepare(
            `INSERT OR REPLACE INTO scenarios (${columns.join(", ")}) VALUES (${placeholders})`,
          )
            .bind(...values)
            .run();
        },
        fields,
        "scenarios",
      );
      return { success: true, codeword, updated_at: now };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  async delete(codeword: string): Promise<DbProxyResult> {
    const result = await this.env.DB.prepare(`DELETE FROM scenarios WHERE codeword = ?`)
      .bind(codeword)
      .run();
    const deleted = (result.meta?.changes ?? 0) > 0;
    return { success: true, deleted, codeword };
  }

  async listUsers(): Promise<DbProxyResult> {
    const result = await this.env.DB.prepare(`SELECT * FROM users`).all();
    return { success: true, data: result.results ?? [] };
  }

  async updateUsers(users: any[]): Promise<DbProxyResult> {
    const results: any[] = [];

    for (const u of users) {
      const userId = u?.user_id;
      const rawFields = u?.fields;

      if (!userId || !rawFields || typeof rawFields !== "object") {
        results.push({
          user_id: userId ?? null,
          success: false,
          error: "user_id і fields обов'язкові",
        });
        continue;
      }

      const fields: Record<string, any> = {};
      for (const [key, value] of Object.entries(rawFields)) {
        if (key === "user_id") continue;
        if (!SAFE_COLUMN_NAME_RE.test(key)) continue;
        fields[key] = value;
      }

      const keys = Object.keys(fields);
      if (keys.length === 0) {
        results.push({
          user_id: userId,
          success: false,
          error: "немає валідних полів для оновлення",
        });
        continue;
      }

      try {
        const setClause = keys.map((k) => `${k} = ?`).join(", ");
        const values = keys.map((k) => fields[k]);

        await withAutoMigrate(
          this.env.DB,
          async () => {
            await this.env.DB.prepare(`UPDATE users SET ${setClause} WHERE user_id = ?`)
              .bind(...values, userId)
              .run();
          },
          fields,
          "users",
        );
        results.push({ user_id: userId, success: true });
      } catch (err) {
        results.push({ user_id: userId, success: false, error: String(err) });
      }
    }

    return { success: true, results };
  }

  async readSettings(): Promise<DbProxyResult> {
    const tableExists = await this.env.DB.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='settings'`,
    ).first();

    if (!tableExists) {
      return { success: true, data: null };
    }

    const row = await this.env.DB.prepare(`SELECT * FROM settings LIMIT 1`).first();
    return { success: true, data: row ?? null };
  }

  async updateSettings(data: Record<string, any>): Promise<DbProxyResult> {
    const fields: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (!SAFE_COLUMN_NAME_RE.test(key)) continue;
      fields[key] = value === "" ? null : value;
    }

    const keys = Object.keys(fields);
    if (keys.length === 0) {
      return { success: false, error: "немає валідних полів" };
    }

    try {
      const tableExists = await this.env.DB.prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='settings'`,
      ).first();

      if (!tableExists) {
        await this.env.DB.prepare(`CREATE TABLE settings (id INTEGER PRIMARY KEY DEFAULT 1)`).run();
      }

      const rowExists = await this.env.DB.prepare(`SELECT id FROM settings LIMIT 1`).first();
      if (!rowExists) {
        await this.env.DB.prepare(`INSERT INTO settings (id) VALUES (1)`).run();
      }

      const setClause = keys.map((k) => `${k} = ?`).join(", ");
      const values = keys.map((k) => fields[k]);

      await withAutoMigrate(
        this.env.DB,
        async () => {
          await this.env.DB.prepare(`UPDATE settings SET ${setClause} WHERE id = 1`)
            .bind(...values)
            .run();
        },
        fields,
        "settings",
      );

      return { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }
}
