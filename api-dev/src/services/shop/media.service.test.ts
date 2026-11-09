/**
 * Файли магазину: облік, завантаження й прибирання.
 *
 * Перевіряємо рішення, які коштують чужого файлу або битої картинки: чужий
 * магазин не показує й не завантажує; прибирання йде «рядок → байти → кеш»;
 * без біндингу бакета це 503, а не виняток.
 *
 * @module api-dev/src/services/shop/media.service.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types";

const state = vi.hoisted(() => ({
  managed: 5 as number | null,
  cacheDeleted: [] as string[],
}));

vi.mock("./shops", () => ({
  ensureShopSchema: async () => {},
  managedShopId: async () => state.managed,
}));
vi.mock("../media-cache", () => ({
  dropCachedMedia: async (key: string) => {
    state.cacheDeleted.push(key);
  },
}));

const { ShopMediaService, readShopMedia } = await import("./media.service");

const ME = 777;
const ROW = {
  id: 3,
  shop_id: 5,
  r2_key: "shop/5/abc-photo.png",
  mime: "image/png",
  bytes: 10,
  kind: "image",
  created_at: "2026-01-01 00:00:00",
};

interface FakeOptions {
  rows?: unknown[];
  row?: unknown | null;
  rowAfterInsert?: unknown | null;
}

interface Captured {
  sql: string;
  binds: unknown[];
}

function makeEnv(options: FakeOptions = {}): {
  env: Env;
  statements: Captured[];
  puts: { key: string; bytes: ArrayBuffer }[];
  deletes: string[];
} {
  const statements: Captured[] = [];
  const puts: { key: string; bytes: ArrayBuffer }[] = [];
  const deletes: string[] = [];

  const db = {
    prepare(sql: string) {
      const record: Captured = { sql, binds: [] };
      statements.push(record);
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        all: async () => ({ results: options.rows ?? [] }),
        first: async () => {
          if (/INSERT/.test(sql)) return null;
          return options.rowAfterInsert !== undefined && /FROM shop_media/.test(sql)
            ? options.rowAfterInsert
            : (options.row ?? null);
        },
        run: async () => ({ meta: { changes: 1, last_row_id: 3 } }),
      };
      return statement;
    },
  };

  const bucket = {
    put: async (key: string, bytes: ArrayBuffer) => {
      puts.push({ key, bytes });
    },
    get: async (key: string) => ({ key }) as unknown as R2ObjectBody,
    delete: async (key: string) => {
      deletes.push(key);
    },
  };

  const env = { DB: db, SHOP_MEDIA: bucket } as unknown as Env;
  return { env, statements, puts, deletes };
}

function file(name = "photo.png", type = "image/png", size = 10): File {
  return { name, type, size, arrayBuffer: async () => new ArrayBuffer(size) } as unknown as File;
}

beforeEach(() => {
  state.managed = 5;
  state.cacheDeleted = [];
});

describe("читання рядків обліку", () => {
  it("перекладає рядок у файл, а невідомий вид — за типом", async () => {
    const { env } = makeEnv({ rows: [{ ...ROW, kind: null }] });

    const media = await readShopMedia(env.DB, 5);

    expect(media).toEqual([
      {
        id: 3,
        shopId: 5,
        key: ROW.r2_key,
        mime: "image/png",
        bytes: 10,
        kind: "image",
        createdAt: ROW.created_at,
      },
    ]);
  });

  it("порожній список номерів — це «нічого не просили», а не весь магазин", async () => {
    const { env, statements } = makeEnv();

    expect(await readShopMedia(env.DB, 5, [])).toEqual([]);
    expect(statements).toEqual([]);
  });
});

describe("власна бібліотека", () => {
  it("чужий магазин не показує файлів", async () => {
    state.managed = null;
    const { env, statements } = makeEnv({ rows: [ROW] });

    expect(await new ShopMediaService(env).listOwn(5, ME)).toBeNull();
    expect(statements).toEqual([]);
  });

  it("свій магазин показує файли", async () => {
    const { env } = makeEnv({ rows: [ROW] });

    expect(await new ShopMediaService(env).listOwn(5, ME)).toHaveLength(1);
  });
});

describe("завантаження", () => {
  it("без біндингу бакета — 503, і жодного запису", async () => {
    const { env, statements } = makeEnv();
    const noBucket = { DB: env.DB } as Env;

    expect(await new ShopMediaService(noBucket).upload(5, ME, file())).toEqual({
      kind: "unavailable",
    });
    expect(statements).toEqual([]);
  });

  it("файл не того типу відхиляється до читання байтів", async () => {
    const { env, puts } = makeEnv();

    const outcome = await new ShopMediaService(env).upload(5, ME, file("doc.svg", "image/svg+xml"));

    expect(outcome.kind).toBe("rejected");
    expect(puts).toEqual([]);
  });

  it("чужий магазин — відмова без запису в бакет", async () => {
    state.managed = null;
    const { env, puts } = makeEnv();

    expect(await new ShopMediaService(env).upload(5, ME, file())).toEqual({ kind: "not_found" });
    expect(puts).toEqual([]);
  });

  it("байти лягають у бакет, рядок — після них", async () => {
    const { env, puts, statements } = makeEnv({ rowAfterInsert: ROW });

    const outcome = await new ShopMediaService(env).upload(5, ME, file());

    expect(outcome.kind).toBe("saved");
    expect(puts).toHaveLength(1);
    expect(statements.some((s) => /INSERT INTO shop_media/.test(s.sql))).toBe(true);
  });

  it("рядок не прочитався після вставки — файл вважається невідомим", async () => {
    const { env } = makeEnv({ rowAfterInsert: null });

    expect(await new ShopMediaService(env).upload(5, ME, file())).toEqual({ kind: "not_found" });
  });
});

describe("прибирання", () => {
  it("чужий магазин — нічого не прибирає", async () => {
    state.managed = null;
    const { env, deletes } = makeEnv({ row: ROW });

    expect(await new ShopMediaService(env).remove(5, ME, 3)).toBe(false);
    expect(deletes).toEqual([]);
  });

  it("неіснуючий файл — нічого не прибирає", async () => {
    const { env, deletes } = makeEnv({ row: null });

    expect(await new ShopMediaService(env).remove(5, ME, 3)).toBe(false);
    expect(deletes).toEqual([]);
  });

  it("рядок, байти й кеш прибираються разом", async () => {
    const { env, statements, deletes } = makeEnv({ row: ROW });

    expect(await new ShopMediaService(env).remove(5, ME, 3)).toBe(true);
    expect(statements.some((s) => /DELETE FROM shop_media/.test(s.sql))).toBe(true);
    expect(deletes).toEqual([ROW.r2_key]);
    expect(state.cacheDeleted).toEqual([ROW.r2_key]);
  });

  it("без бакета рядок і кеш усе одно прибираються", async () => {
    const { env, deletes } = makeEnv({ row: ROW });
    const noBucket = { DB: env.DB } as Env;

    expect(await new ShopMediaService(noBucket).remove(5, ME, 3)).toBe(true);
    expect(deletes).toEqual([]);
    expect(state.cacheDeleted).toEqual([ROW.r2_key]);
  });
});

describe("байти за ключем", () => {
  it("без бакета — нічого", async () => {
    const { env } = makeEnv();

    expect(await new ShopMediaService({ DB: env.DB } as Env).read(ROW.r2_key)).toBeNull();
  });

  it("ключ не з форми файлу магазину — не питає бакет", async () => {
    const { env } = makeEnv();

    expect(await new ShopMediaService(env).read("../../etc/passwd")).toBeNull();
  });

  it("справжній ключ читає бакет", async () => {
    const { env } = makeEnv();

    expect(await new ShopMediaService(env).read(ROW.r2_key)).not.toBeNull();
  });
});
