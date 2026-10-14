/**
 * Публічний профіль: **видиме назовні збирається запитом, а не розміткою**.
 *
 * Тут тримається те, що ламається мовчки: приватний профіль не дістати ні
 * списком, ні за номером; заблокованого немає навіть у відкритій стрічці; а
 * перемикач без списку полів не стирає вже збережений набір. Межі запиту
 * (`clampPublicLimit`) міряються окремо — сміття має давати межу, а не помилку.
 *
 * @module api-dev/src/services/public-profile.service.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { PUBLIC_PAGE_SIZE, PublicProfileService, clampPublicLimit } from "./public-profile.service";

const USER_ID = 777;

/** Колонки `users` — щоб `ensureTables` не вигадував `ALTER` на кожен прогін. */
const USER_COLUMNS = [
  "user_id",
  "about",
  "profile_public",
  "profile_public_fields",
  "is_blocked",
  "platform_username",
  "photo_url",
  "role",
  "tariff",
  "status",
  "language",
  "created_at",
];

interface Captured {
  sql: string;
  binds: unknown[];
}

/** Заглушка D1: `first` — один рядок, `all` — список; PRAGMA віддає колонки. */
function makeDb(
  row: unknown = null,
  rows: unknown[] = [],
): {
  env: Env;
  statements: Captured[];
} {
  const statements: Captured[] = [];
  const db = {
    prepare: (sql: string) => {
      const record: Captured = { sql, binds: [] };
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => row,
        all: async () =>
          /^PRAGMA/i.test(sql)
            ? { results: USER_COLUMNS.map((name) => ({ name })) }
            : { results: rows },
        run: async () => ({ meta: { changes: 1, last_row_id: 1 } }),
      };
      statements.push(record);
      return statement;
    },
  };
  return { env: { DB: db, BOT_TOKEN: "123456:TEST" } as unknown as Env, statements };
}

describe("межа запиту", () => {
  it("сміття й від'ємне дають типову сторінку, а не помилку", () => {
    expect(clampPublicLimit(undefined)).toBe(PUBLIC_PAGE_SIZE);
    expect(clampPublicLimit("abc")).toBe(PUBLIC_PAGE_SIZE);
    expect(clampPublicLimit(0)).toBe(PUBLIC_PAGE_SIZE);
  });

  it("перебір упирається в стелю", () => {
    expect(clampPublicLimit(10)).toBe(10);
    expect(clampPublicLimit(100000)).toBe(100);
  });
});

describe("налаштування власного профілю", () => {
  it("рядка немає — це типове «нічого не обрано»", async () => {
    const db = makeDb(null);
    const settings = await new PublicProfileService(db.env).readSettings(USER_ID);

    expect(settings.about).toBe("");
    expect(settings.isPublic).toBe(false);
    expect(settings.openFields.length).toBeGreaterThan(0);
  });

  it("збережене читається з рядка як є", async () => {
    const db = makeDb({
      about: "Привіт",
      profile_public: 1,
      profile_public_fields: '["about","role"]',
    });
    const settings = await new PublicProfileService(db.env).readSettings(USER_ID);

    expect(settings.about).toBe("Привіт");
    expect(settings.isPublic).toBe(true);
    expect(settings.openFields).toEqual(["about", "role"]);
  });

  it("«Про себе» зберігається й повертається", async () => {
    const db = makeDb(null);
    const result = await new PublicProfileService(db.env).saveAbout(USER_ID, "  Привіт  ");

    expect(result).toEqual({ ok: true, value: "Привіт" });
    expect(db.statements.some((s) => /^UPDATE\s+users/i.test(s.sql.trimStart()))).toBe(true);
  });

  it("не-текст у «Про себе» не доходить до `UPDATE`", async () => {
    const db = makeDb(null);
    const result = await new PublicProfileService(db.env).saveAbout(USER_ID, 123);

    expect(result.ok).toBe(false);
    expect(db.statements.some((s) => /^UPDATE\s+users/i.test(s.sql.trimStart()))).toBe(false);
  });

  it("увімкнення профілю разом із полями — одним записом", async () => {
    const db = makeDb({ about: "", profile_public: 0, profile_public_fields: null });
    const settings = await new PublicProfileService(db.env).saveVisibility(USER_ID, {
      isPublic: true,
      fields: ["about", "role"],
    });

    expect(settings.isPublic).toBe(true);
    expect(settings.openFields).toEqual(["about", "role"]);

    const update = db.statements.find((s) => /^UPDATE\s+users/i.test(s.sql.trimStart()));
    expect(update?.binds[0]).toBe(1);
  });

  it("перемикач без списку полів лишає набір як є", async () => {
    const db = makeDb({
      about: "",
      profile_public: 0,
      profile_public_fields: '["about","role"]',
    });
    const settings = await new PublicProfileService(db.env).saveVisibility(USER_ID, {
      isPublic: false,
    });

    expect(settings.isPublic).toBe(false);
    expect(settings.openFields).toEqual(["about", "role"]);
  });
});

describe("те, що бачать інші", () => {
  it("стрічка віддає лише те, що відібрав запит", async () => {
    const db = makeDb(null, [
      {
        user_id: 5,
        platform_username: "olena",
        photo_url: null,
        about: "Привіт",
        role: "user",
        tariff: null,
        status: null,
        language: null,
        created_at: null,
        profile_public_fields: '["about"]',
      },
    ]);
    const items = await new PublicProfileService(db.env).listPublic();

    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(5);
    expect(items[0].about).toBe("Привіт");

    const select = db.statements.find((s) => /FROM users/i.test(s.sql));
    // Приватність стоїть у самому запиті, а не окремою перевіркою.
    expect(select?.sql).toMatch(/profile_public = 1/);
    expect(select?.sql).toMatch(/is_blocked = 0/);
  });

  it("закритий профіль за номером не дістати", async () => {
    const db = makeDb(null);
    expect(await new PublicProfileService(db.env).readPublic(5)).toBeNull();
  });

  it("відкритий профіль віддається за номером", async () => {
    const db = makeDb({
      user_id: 5,
      platform_username: "olena",
      photo_url: null,
      about: null,
      role: null,
      tariff: null,
      status: null,
      language: null,
      created_at: null,
      profile_public_fields: null,
    });
    const profile = await new PublicProfileService(db.env).readPublic(5);

    expect(profile?.id).toBe(5);
  });
});
