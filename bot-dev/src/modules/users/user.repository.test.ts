/**
 * Створення користувача — рядок, який мусить мати час.
 *
 * Це не косметика: у живій базі `users.created_at` оголошено `NOT NULL` без
 * значення за замовчуванням, і `INSERT` без нього падає. Помилка при цьому
 * **тиха для коду й гучна для людини**: `/start` не дає нічого, а в логах
 * лишається `NOT NULL constraint failed: users.created_at`. Саме тому перевірка
 * тут, а не «подивимось на живій базі».
 *
 * @module bot-dev/src/modules/users/user.repository.test
 */

import { describe, expect, it } from "vitest";
import type { D1Database } from "@cloudflare/workers-types";
import type { Env } from "../../shared/types/env";
import { UserRepository } from "./user.repository";

/** Середовище — тільки база: більше репозиторію нічого не треба. */
function env(db: D1Database): Env {
  return { DB: db } as unknown as Env;
}

interface Statement {
  sql: string;
  binds: unknown[];
}

/** База, яка лише записує, що в неї просили зробити. */
function makeDb(): { db: D1Database; statements: Statement[] } {
  const statements: Statement[] = [];
  const db = {
    prepare(sql: string) {
      const entry: Statement = { sql, binds: [] };
      statements.push(entry);
      const statement = {
        bind: (...args: unknown[]) => {
          entry.binds = args;
          return statement;
        },
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => ({ meta: { changes: 1, last_row_id: 1 } }),
      };
      return statement;
    },
  } as unknown as D1Database;
  return { db, statements };
}

/** Сама вставка, а не службові запити `ensureTables`. */
function insertOf(statements: readonly Statement[]): Statement {
  const insert = statements.find((entry) => /INSERT INTO users/i.test(entry.sql));
  if (!insert) throw new Error("INSERT у users не виконано");
  return insert;
}

describe("UserRepository.createUser", () => {
  it("ставить час створення — без нього рядок не створюється взагалі", async () => {
    const { db, statements } = makeDb();

    await new UserRepository(env(db)).createUser(6281898553, {
      first_name: "Сергій",
      username: "sergey",
    });

    const insert = insertOf(statements);
    expect(insert.sql).toMatch(/created_at/);

    const createdAt = insert.binds.find(
      (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value),
    );
    expect(createdAt).toBeDefined();
  });

  it("переданий ззовні час не перекриває — дата лишається тією, що дали", async () => {
    const { db, statements } = makeDb();

    await new UserRepository(env(db)).createUser(1, {
      first_name: "Карас",
      created_at: "2026-01-02 03:04:05",
    });

    expect(insertOf(statements).binds).toContain("2026-01-02 03:04:05");
  });

  it("власника id пише з аргументу, а не з даних", async () => {
    const { db, statements } = makeDb();

    await new UserRepository(env(db)).createUser(42, { first_name: "Настя" });

    expect(insertOf(statements).binds[0]).toBe(42);
  });
});
