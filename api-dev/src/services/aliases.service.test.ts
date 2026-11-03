/**
 * Старі адреси: нормалізація, «вести нікуди» й відсутність ланцюжків.
 *
 * Перевіряються рішення, а не SQLite: адреса нормалізується так само, як у
 * маршруті, самопосилання не стає редиректом, а перенос цілей робить alias
 * завжди актуальним (`docs/URL.md`).
 */

import { describe, expect, it } from "vitest";
import { moveAliases, redirectTargetFor, rememberAlias } from "./aliases.service";

interface Captured {
  sql: string;
  binds: unknown[];
}

function fakeDb(joined: { slug: string } | null = null) {
  const statements: Captured[] = [];

  const db = {
    prepare(sql: string) {
      const record: Captured = { sql, binds: [] };
      statements.push(record);
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => (sql.includes("JOIN scenarios") ? joined : null),
        all: async () => ({
          results: sql.includes("PRAGMA")
            ? ["alias", "slug", "created_at"].map((name) => ({ name }))
            : [],
        }),
        run: async () => ({ meta: { changes: 1 } }),
      };
      return statement;
    },
  };

  return { db: db as unknown as D1Database, statements };
}

describe("redirectTargetFor", () => {
  it("нормалізує шлях і віддає поточну адресу", async () => {
    const { db, statements } = fakeDb({ slug: "viruvannia/sto-vidsotkiv" });

    await expect(redirectTargetFor(db, "/viruvannia-a1/")).resolves.toBe(
      "viruvannia/sto-vidsotkiv",
    );

    const lookup = statements.find((item) => item.sql.includes("JOIN scenarios"));
    expect(lookup?.binds).toEqual(["viruvannia-a1"]);
  });

  it("порожній шлях не питає базу", async () => {
    const { db, statements } = fakeDb({ slug: "x" });

    await expect(redirectTargetFor(db, "  ")).resolves.toBeNull();
    expect(statements).toHaveLength(0);
  });

  it("alias на себе — не редирект (інакше був би цикл)", async () => {
    const { db } = fakeDb({ slug: "olena" });

    await expect(redirectTargetFor(db, "/olena")).resolves.toBeNull();
  });

  it("мертва ціль не веде нікуди", async () => {
    const { db } = fakeDb(null);

    await expect(redirectTargetFor(db, "/stara")).resolves.toBeNull();
  });
});

describe("rememberAlias", () => {
  it("пише стару адресу й обрізає історію", async () => {
    const { db, statements } = fakeDb();

    await rememberAlias(db, "/olena", "olena-k");

    const insert = statements.find((item) => item.sql.startsWith("INSERT"));
    expect(insert?.sql).toContain("INSERT OR REPLACE INTO slug_aliases");
    expect(insert?.binds).toEqual(["olena", "olena-k"]);
    expect(statements.some((item) => item.sql.includes("OFFSET"))).toBe(true);
  });

  it("та сама адреса — не alias", async () => {
    const { db, statements } = fakeDb();

    await rememberAlias(db, "olena", "olena");

    expect(statements.some((item) => item.sql.startsWith("INSERT"))).toBe(false);
  });
});

describe("moveAliases", () => {
  it("переносить цілі, а не джерела", async () => {
    const { db, statements } = fakeDb();

    await moveAliases(db, "stara", "nova");

    const update = statements.find((item) => item.sql.startsWith("UPDATE"));
    expect(update?.sql).toBe("UPDATE slug_aliases SET slug = ? WHERE slug = ?");
    expect(update?.binds).toEqual(["nova", "stara"]);
  });
});
