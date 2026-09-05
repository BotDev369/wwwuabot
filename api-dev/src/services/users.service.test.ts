import { describe, it, expect, vi } from "vitest";
import { UsersService } from "./users.service";
import type { Env } from "../shared/types";

function createMockEnv(overrides?: Partial<Env>): { env: Env; mockDb: ReturnType<typeof vi.fn> & { prepare: ReturnType<typeof vi.fn> } } {
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
    it("fetches user by ID and ensures is_blocked column", async () => {
      const { env, mockDb } = createMockEnv();

      // Mock ensureIsBlocked
      const alterStatement = {
        run: vi.fn().mockResolvedValue({}),
      };
      // Mock SELECT statement
      const selectStatement = {
        bind: vi.fn().mockReturnThis(),
        first: vi.fn().mockResolvedValue({ user_id: 123, first_name: "TestUser" }),
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes("ALTER TABLE")) return alterStatement;
        return selectStatement;
      });

      const service = new UsersService(env);
      const user = await service.readUser(123);

      expect(user).toEqual({ user_id: 123, first_name: "TestUser" });
      expect(selectStatement.bind).toHaveBeenCalledWith(123);
    });

    it("returns null if user does not exist", async () => {
      const { env, mockDb } = createMockEnv();
      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes("ALTER TABLE")) return { run: vi.fn().mockResolvedValue({}) };
        return {
          bind: vi.fn().mockReturnThis(),
          first: vi.fn().mockResolvedValue(null),
        };
      });

      const service = new UsersService(env);
      const user = await service.readUser(999);
      expect(user).toBeNull();
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
      await expect(service.updateUser(123, { user_id: 999 })).rejects.toThrow("no fields to update");
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
        expect.stringContaining("UPDATE users SET first_name = ? WHERE user_id = ?")
      );
      expect(updateStmt.bind).toHaveBeenCalledWith("Alice", 123);
    });
  });

  describe("bulkUsers", () => {
    it("handles bulk delete with multiple IDs", async () => {
      const { env, mockDb } = createMockEnv();
      const alterStatement = { run: vi.fn().mockResolvedValue({}) };
      const bulkDeleteStmt = {
        bind: vi.fn().mockReturnThis(),
        run: vi.fn().mockResolvedValue({ meta: { changes: 3 } }),
      };

      mockDb.prepare.mockImplementation((sql: string) => {
        if (sql.includes("ALTER TABLE")) return alterStatement;
        return bulkDeleteStmt;
      });

      const service = new UsersService(env);
      const count = await service.bulkUsers("delete", [1, 2, 3]);

      expect(count).toBe(3);
      expect(mockDb.prepare).toHaveBeenCalledWith(
        "DELETE FROM users WHERE user_id IN (?,?,?)"
      );
      expect(bulkDeleteStmt.bind).toHaveBeenCalledWith(1, 2, 3);
    });
  });

  describe("sendUserMessage", () => {
    it("throws error if BOT_TOKEN is missing", async () => {
      const { env } = createMockEnv({ BOT_TOKEN: undefined });
      const service = new UsersService(env);

      await expect(service.sendUserMessage(123, "Hello")).rejects.toThrow("BOT_TOKEN not configured");
    });
  });
});
