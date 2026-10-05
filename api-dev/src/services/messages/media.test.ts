/**
 * Фото в листуванні: завантаження, приєднання й прибирання.
 *
 * Чотири рішення, які коштують чужої розмови або чужого файлу: зв'язок перевіряється
 * першим; чужий, неіснуючий і вже приєднаний файл відмовляються однаково; прибирання
 * йде «рядок → байти» до видалення листів.
 * @module api-dev/src/services/messages/media.test
 */

import { describe, expect, it } from "vitest";
import { attachableMedia, dropThreadMedia, readMessageMedia, uploadMessageMedia } from "./media";
import type { Env } from "../../shared/types";

const ME = 1;
const PEER = 2;

interface Captured {
  sql: string;
  binds: unknown[];
}

interface FakeOptions {
  linked?: boolean;
  ownCount?: number;
  /** Рядок обліку, який поверне запит за файлом. */
  mediaRow?: { id: number; r2_key: string; mime: string | null; bytes: number | null } | null;
  attached?: { id: number; r2_key: string }[];
}

function makeEnv(options: FakeOptions = {}): {
  env: Env;
  statements: Captured[];
  puts: string[];
  deletes: string[];
} {
  const statements: Captured[] = [];
  const puts: string[] = [];
  const deletes: string[] = [];
  /** Те, що сервер щойно записав у рядок обліку (фейк повертає його на запит). */
  let inserted: { key: string; mime: string } | null = null;

  const db = {
    prepare(sql: string) {
      const record: Captured = { sql, binds: [] };
      statements.push(record);
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => {
          if (/FROM contacts/.test(sql)) return options.linked === false ? null : { id: 1 };
          if (/FROM shop_orders/.test(sql)) return null;
          if (/COUNT\(\*\)/.test(sql)) return { total: options.ownCount ?? 0 };
          if (/FROM message_media/.test(sql) && !/NOT EXISTS/.test(sql) && inserted) {
            return { id: 55, r2_key: inserted.key, mime: inserted.mime, bytes: 1024 };
          }
          if (/FROM message_media/.test(sql)) return options.mediaRow ?? null;
          return null;
        },
        all: async () => {
          if (/JOIN message_media/.test(sql)) return { results: options.attached ?? [] };
          return { results: [] };
        },
        run: async () => {
          if (/INSERT INTO message_media/.test(sql)) {
            inserted = { key: String(record.binds[1]), mime: String(record.binds[2]) };
          }
          return { meta: { changes: 1, last_row_id: 55 } };
        },
      };
      return statement;
    },
  };

  const bucket = {
    put: async (key: string) => {
      puts.push(key);
    },
    get: async () => null,
    delete: async (key: string) => {
      deletes.push(key);
    },
  };

  const env = {
    DB: db,
    MESSAGE_MEDIA: bucket,
  } as unknown as Env;

  return { env, statements, puts, deletes };
}

/** Файл, який сервер прийме, і файл, який відхилить. */
function file(name = "skrin.png", type = "image/png", size = 1024): File {
  return { name, type, size, arrayBuffer: async () => new ArrayBuffer(size) } as unknown as File;
}

function touchedMedia(statements: Captured[]): boolean {
  return statements.some((s) => /message_media/.test(s.sql));
}

describe("завантаження фото", () => {
  it("без зв'язку — та сама відмова, що й в неіснуючої розмови, і жодного запиту про файли", async () => {
    const { env, statements, puts } = makeEnv({ linked: false });
    const outcome = await uploadMessageMedia(env, ME, 99, file());

    expect(outcome.kind).toBe("no_link");
    expect(touchedMedia(statements)).toBe(false);
    expect(puts).toEqual([]);
  });

  it("фото не того типу відхиляється до читання байтів", async () => {
    const { env, puts } = makeEnv();
    const outcome = await uploadMessageMedia(env, ME, PEER, file("skrin.svg", "image/svg+xml"));

    expect(outcome.kind).toBe("rejected");
    expect(puts).toEqual([]);
  });

  it("без бакета — «сховище не налаштоване», а не виняток", async () => {
    const { env } = makeEnv();
    const withoutBucket = { DB: env.DB } as Env;

    expect((await uploadMessageMedia(withoutBucket, ME, PEER, file())).kind).toBe("unavailable");
  });

  it("ліміт файлів людини зупиняє завантаження до запису в сховище", async () => {
    const { env, puts } = makeEnv({ ownCount: 300 });
    const outcome = await uploadMessageMedia(env, ME, PEER, file());

    expect(outcome.kind).toBe("rejected");
    expect(puts).toEqual([]);
  });

  it("успішне завантаження пише ключ у бакут і рядок обліку", async () => {
    const { env, statements, puts } = makeEnv();
    const outcome = await uploadMessageMedia(env, ME, PEER, file());

    expect(outcome.kind).toBe("saved");
    // Ключ, який пішов у бакет, — простір `msg/`, людина й випадкова частина:
    // саме з нього будується адреса, за якою фото читають без `initData`.
    expect(puts[0]).toMatch(/^msg\/1\/[0-9a-f]{12}-skrin\.png$/);
    expect(outcome.kind === "saved" && outcome.media.key).toBe(puts[0]);

    const insert = statements.find((s) => /INSERT INTO message_media/.test(s.sql));
    expect(insert?.binds[0]).toBe(ME);
  });
});

describe("приєднання фото до повідомлення", () => {
  it("приєднується лише фото, яке ще нікуди не приєднано", async () => {
    const { env, statements } = makeEnv({
      mediaRow: { id: 9, r2_key: "msg/1/a-b.png", mime: "image/png", bytes: 10 },
    });
    const media = await attachableMedia(env, ME, 9);

    expect(media?.id).toBe(9);
    // Умова «уже приєднано» — у тому самому запиті: окремий запит був би другим
    // правилом і лишився б без перевірки.
    expect(statements.some((s) => /NOT EXISTS/.test(s.sql))).toBe(true);
    expect(statements[0].binds).toEqual([9, ME]);
  });

  it("чужий, неіснуючий або вже приєднаний файл — одна й та сама відмова", async () => {
    const { env } = makeEnv({ mediaRow: null });

    expect(await attachableMedia(env, ME, 9)).toBeNull();
  });
});

describe("прибирання фото розмови", () => {
  it("спершу рядок обліку, потім байти — і тільки ті, що були приєднані", async () => {
    const { env, statements, deletes } = makeEnv({
      attached: [
        { id: 1, r2_key: "msg/1/a-b.png" },
        { id: 2, r2_key: "msg/2/c-d.png" },
      ],
    });

    await dropThreadMedia(env, 7);

    const order = statements.map((s) => s.sql.replace(/\s+/g, " ").trim());
    expect(order.some((sql) => /DELETE FROM message_media/.test(sql))).toBe(true);
    expect(deletes.sort()).toEqual(["msg/1/a-b.png", "msg/2/c-d.png"]);
  });

  it("немає приєднаних фото — не пишемо рядки й не видаляємо байти", async () => {
    const { env, statements, deletes } = makeEnv({ attached: [] });

    await dropThreadMedia(env, 7);

    // Єдиний запит — той, що читав, які файли приєднані; жодного запису на
    // запис і жодного видалення в бакеті.
    expect(statements.map((s) => s.sql)).toHaveLength(1);
    expect(statements.some((s) => /DELETE FROM message_media/.test(s.sql))).toBe(false);
    expect(deletes).toEqual([]);
  });
});

describe("віддача файлу", () => {
  it("чужий простір ключів і вихід угору не питаємо в бакета", async () => {
    const { env } = makeEnv();

    expect(await readMessageMedia(env, "shop/1/a.jpg")).toBeNull();
    expect(await readMessageMedia(env, "msg/1/../../secrets.txt")).toBeNull();
  });
});
