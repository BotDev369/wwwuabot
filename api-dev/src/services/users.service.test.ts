import { afterEach, describe, it, expect, vi } from "vitest";
import type { Env } from "../shared/types";
import { UsersService } from "./users.service";

afterEach(() => {
  vi.unstubAllGlobals();
});

function createMockEnv(overrides?: Partial<Env>): {
  env: Env;
  mockDb: { prepare: ReturnType<typeof vi.fn> };
} {
  const mockDb = {
    prepare: vi.fn(),
  };

  const mockKv = {
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  };
  const env: Env = {
    DB: mockDb as unknown as D1Database,
    CONTENT_KV: mockKv as unknown as KVNamespace,
    ADMIN_SECRET: "test-secret",
    ...overrides,
  };

  return { env, mockDb };
}

describe("UsersService", () => {
  describe("readUser", () => {
    it("checks the dynamic block column through the shared migration helper", async () => {
      const { env, mockDb } = createMockEnv();
      const selectStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ user_id: 123, first_name: "TestUser" }),
      };
      const schemaProbe = {
        first: vi
          .fn()
          .mockRejectedValueOnce(new Error("no such column: is_blocked"))
          .mockResolvedValue(null),
      };
      const alterStatement = { run: vi.fn().mockResolvedValue({}) };
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes("LIMIT 0")) return schemaProbe;
        if (sql.startsWith("ALTER TABLE")) return alterStatement;
        return selectStatement;
      });

      const service = new UsersService(env);
      const user = await service.readUser(123);

      expect(user).toEqual({ user_id: 123, first_name: "TestUser" });
      expect(selectStatement.bind).toHaveBeenCalledWith(123);
      expect(mockDb.prepare).toHaveBeenCalledWith("SELECT is_blocked FROM users LIMIT 0");
      expect(mockDb.prepare).toHaveBeenCalledWith(
        "ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT NULL",
      );
      expect(alterStatement.run).toHaveBeenCalledOnce();
    });

    it("returns null if user does not exist", async () => {
      const { env, mockDb } = createMockEnv();
      mockDb.prepare.mockImplementation((sql: string) =>
        sql.includes("LIMIT 0")
          ? { first: vi.fn().mockResolvedValue(null) }
          : {
              bind: vi.fn().mockReturnThis(),
              first: vi.fn().mockResolvedValue(null),
            },
      );

      const service = new UsersService(env);
      const user = await service.readUser(999);
      expect(user).toBeNull();
    });
  });

  describe("listUsers", () => {
    it("reads the list after the schema probe", async () => {
      const { env, mockDb } = createMockEnv();
      const schemaProbe = { first: vi.fn().mockResolvedValue(null) };
      const listStatement = {
        all: vi.fn().mockResolvedValue({ results: [{ user_id: 1, first_name: "Alice" }] }),
      };
      mockDb.prepare.mockImplementation((sql: string) =>
        sql.includes("LIMIT 0") ? schemaProbe : listStatement,
      );

      const rows = await new UsersService(env).listUsers();

      expect(rows).toEqual([{ user_id: 1, first_name: "Alice" }]);
      expect(mockDb.prepare).toHaveBeenCalledWith("SELECT is_blocked FROM users LIMIT 0");
    });

    it("⛔ відсутня таблиця — порожній список, а не падіння адмінки", async () => {
      const { env, mockDb } = createMockEnv();
      mockDb.prepare.mockImplementation((sql: string) =>
        sql.includes("LIMIT 0")
          ? { first: vi.fn().mockResolvedValue(null) }
          : { all: vi.fn().mockRejectedValue(new Error("no such table: users")) },
      );

      expect(await new UsersService(env).listUsers()).toEqual([]);
    });

    it("інша помилка БД не ковтається — інакше адмінка показує «порожньо»", async () => {
      const { env, mockDb } = createMockEnv();
      mockDb.prepare.mockImplementation((sql: string) =>
        sql.includes("LIMIT 0")
          ? { first: vi.fn().mockResolvedValue(null) }
          : { all: vi.fn().mockRejectedValue(new Error("D1_ERROR: disk I/O error")) },
      );

      await expect(new UsersService(env).listUsers()).rejects.toThrow("disk I/O error");
    });
  });

  describe("deleteUser", () => {
    it("returns true when row was deleted", async () => {
      const { env, mockDb } = createMockEnv();
      const deleteStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
      };
      mockDb.prepare.mockReturnValue(deleteStatement);

      const service = new UsersService(env);
      const deleted = await service.deleteUser(456);

      expect(deleted).toBe(true);
      expect(deleteStatement.bind).toHaveBeenCalledWith(456);
    });

    it("returns false when no rows were changed", async () => {
      const { env, mockDb } = createMockEnv();
      mockDb.prepare.mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { changes: 0 } }),
      });

      const service = new UsersService(env);
      const deleted = await service.deleteUser(999);
      expect(deleted).toBe(false);
    });
  });

  describe("updateUser", () => {
    it("throws error when no valid fields are provided or only protected fields", async () => {
      const { env } = createMockEnv();
      const service = new UsersService(env);

      await expect(service.updateUser(123, {})).rejects.toThrow("no fields to update");
      await expect(service.updateUser(123, { user_id: 999 })).rejects.toThrow(
        "no fields to update",
      );
    });

    it("updates allowed fields and ignores unsafe keys", async () => {
      const { env, mockDb } = createMockEnv();
      const updateStmt = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({}),
      };
      mockDb.prepare.mockReturnValue(updateStmt);

      const service = new UsersService(env);
      await service.updateUser(123, {
        first_name: "Alice",
        user_id: 999, // should be filtered
        "bad-name-!": "hacker", // should be filtered
      });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE users SET first_name = ? WHERE user_id = ?"),
      );
      expect(updateStmt.bind).toHaveBeenCalledWith("Alice", 123);
    });

    it("adds a dynamic field through the shared helper and retries the update", async () => {
      const { env, mockDb } = createMockEnv();
      const updateStmt = {
        bind: vi.fn().mockReturnThis(),
        run: vi
          .fn()
          .mockRejectedValueOnce(new Error("no such column: custom_field"))
          .mockResolvedValue({}),
      };
      const alterStmt = { run: vi.fn().mockResolvedValue({}) };
      mockDb.prepare.mockImplementation((sql: string) =>
        sql.startsWith("ALTER TABLE") ? alterStmt : updateStmt,
      );

      const service = new UsersService(env);
      await service.updateUser(123, { custom_field: "value" });

      expect(mockDb.prepare).toHaveBeenCalledWith(
        "UPDATE users SET custom_field = ? WHERE user_id = ?",
      );
      expect(mockDb.prepare).toHaveBeenCalledWith(
        "ALTER TABLE users ADD COLUMN custom_field TEXT DEFAULT NULL",
      );
      expect(updateStmt.bind).toHaveBeenCalledTimes(2);
      expect(updateStmt.run).toHaveBeenCalledTimes(2);
      expect(alterStmt.run).toHaveBeenCalledOnce();
    });
  });

  describe("blockUser", () => {
    it("writes the new state and notifies on a real change", async () => {
      const { env, mockDb } = createMockEnv();
      const schemaProbe = { first: vi.fn().mockResolvedValue(null) };
      const currentStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ is_blocked: 0 }),
      };
      const updateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({}),
      };
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes("LIMIT 0")) return schemaProbe;
        if (sql.startsWith("UPDATE")) return updateStatement;
        return currentStatement;
      });

      await new UsersService(env).blockUser(7, true);

      expect(updateStatement.bind).toHaveBeenCalledWith(1, 7);
    });

    it("sends the block notice when the bot token is configured", async () => {
      const { env, mockDb } = createMockEnv({ BOT_TOKEN: "token" });
      const schemaProbe = { first: vi.fn().mockResolvedValue(null) };
      const currentStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ is_blocked: 0 }),
      };
      const updateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({}),
      };
      const scenarioStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue(null),
      };
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes("LIMIT 0")) return schemaProbe;
        if (sql.startsWith("UPDATE")) return updateStatement;
        if (sql.includes("FROM scenarios")) return scenarioStatement;
        return currentStatement;
      });
      const fetchMock = vi.fn().mockResolvedValue({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      await new UsersService(env).blockUser(7, true);

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.telegram.org/bottoken/sendMessage",
        expect.objectContaining({ method: "POST" }),
      );
    });

    it("unblocking clears the active scenario and falls back to text when the photo fails", async () => {
      const { env, mockDb } = createMockEnv({ BOT_TOKEN: "token" });
      const schemaProbe = { first: vi.fn().mockResolvedValue(null) };
      const currentStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ is_blocked: 1 }),
      };
      const updateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({}),
      };
      const scenarioStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({
          caption_top: "Доступ відновлено",
          caption_mid: "",
          caption_bot: "",
          buttons: '[[{"text":"Далі"}]]',
          photo_url: "https://example.com/photo.png",
        }),
      };
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes("LIMIT 0")) return schemaProbe;
        if (sql.startsWith("UPDATE")) return updateStatement;
        if (sql.includes("FROM scenarios")) return scenarioStatement;
        return currentStatement;
      });
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({ ok: true });
      vi.stubGlobal("fetch", fetchMock);

      await new UsersService(env).blockUser(7, false);

      expect(updateStatement.bind).toHaveBeenCalledWith(0, 7);
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "https://api.telegram.org/bottoken/sendPhoto",
        expect.objectContaining({ method: "POST" }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "https://api.telegram.org/bottoken/sendMessage",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });

  describe("bulkUsers", () => {
    it("handles bulk delete with multiple IDs", async () => {
      const { env, mockDb } = createMockEnv();
      const bulkDeleteStmt = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { changes: 3 } }),
      };

      mockDb.prepare.mockReturnValue(bulkDeleteStmt);

      const service = new UsersService(env);
      const count = await service.bulkUsers("delete", [1, 2, 3]);

      expect(count).toBe(3);
      expect(mockDb.prepare).toHaveBeenCalledWith("DELETE FROM users WHERE user_id IN (?,?,?)");
      expect(bulkDeleteStmt.bind).toHaveBeenCalledWith(1, 2, 3);
    });
  });

  describe("bulkUsers block", () => {
    it("an empty list is a no-op — no query at all", async () => {
      const { env, mockDb } = createMockEnv();

      expect(await new UsersService(env).bulkUsers("block", [])).toBe(0);
      expect(mockDb.prepare).not.toHaveBeenCalled();
    });

    it("block updates every row in one statement", async () => {
      const { env, mockDb } = createMockEnv();
      const schemaProbe = { first: vi.fn().mockResolvedValue(null) };
      const currentStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ is_blocked: 0 }),
      };
      const updateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { changes: 2 } }),
      };
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes("LIMIT 0")) return schemaProbe;
        if (sql.startsWith("UPDATE")) return updateStatement;
        return currentStatement;
      });

      const count = await new UsersService(env).bulkUsers("block", [1, 2]);

      expect(count).toBe(2);
      expect(updateStatement.bind).toHaveBeenCalledWith(1, 1, 2);
    });

    it("a failed status check does not stop the rest of the batch", async () => {
      const { env, mockDb } = createMockEnv();
      const schemaProbe = { first: vi.fn().mockResolvedValue(null) };
      const failingCheck = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockRejectedValue(new Error("D1_ERROR")),
      };
      const updateStatement = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { changes: 1 } }),
      };
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes("LIMIT 0")) return schemaProbe;
        if (sql.startsWith("UPDATE")) return updateStatement;
        return failingCheck;
      });

      expect(await new UsersService(env).bulkUsers("unblock", [5])).toBe(1);
    });
  });

  describe("sendUserMessage", () => {
    it("throws error if BOT_TOKEN is missing", async () => {
      const { env } = createMockEnv({ BOT_TOKEN: undefined });
      const service = new UsersService(env);

      await expect(service.sendUserMessage(123, "Hello")).rejects.toThrow(
        "BOT_TOKEN not configured",
      );
    });

    it("posts the text to Telegram", async () => {
      const { env } = createMockEnv({ BOT_TOKEN: "token" });
      const fetchMock = vi
        .fn()
        .mockResolvedValue({ json: vi.fn().mockResolvedValue({ ok: true }) });
      vi.stubGlobal("fetch", fetchMock);

      await new UsersService(env).sendUserMessage(7, "Привіт");

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.telegram.org/bottoken/sendMessage",
        expect.objectContaining({ body: JSON.stringify({ chat_id: 7, text: "Привіт" }) }),
      );
    });

    it("a refused message becomes an error, not a silent no-op", async () => {
      const { env } = createMockEnv({ BOT_TOKEN: "token" });
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          json: vi.fn().mockResolvedValue({ ok: false, description: "chat not found" }),
        }),
      );

      await expect(new UsersService(env).sendUserMessage(7, "Привіт")).rejects.toThrow(
        "chat not found",
      );
    });
  });
});
