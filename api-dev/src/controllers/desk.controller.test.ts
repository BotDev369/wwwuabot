/**
 * «Стіл»: правило «хід — рішення», файли спершу рядком, порожнє — не запис.
 *
 * Заглушка D1 та сама, що в `notes.controller.test.ts`: перехоплює SQL і
 * дозволяє перевірити, що саме піде в базу, а не лише код відповіді.
 *
 * @module api-dev/src/controllers/desk.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import {
  buildEntryInput,
  buildThreadInput,
  sanitizeDueAt,
  sanitizeMeta,
  sanitizePriority,
  sanitizeTitle,
  type DeskEntry,
  type DeskThread,
} from "@wwwuabot/shared/desk/model";
import { sanitizeTags } from "@wwwuabot/shared/notes";
import { deskFileKey } from "../services/desk/files";
import { handleDesk } from "./desk.controller";

interface Captured {
  sql: string;
  binds: unknown[];
}

function makeDb(
  options: { row?: unknown; rows?: unknown[]; changes?: number; lastRowId?: number } = {},
): { env: Env; statements: Captured[] } {
  const statements: Captured[] = [];
  const db = {
    prepare: (sql: string) => {
      const record: Captured = { sql, binds: [] };
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => options.row ?? null,
        all: async () => ({ results: options.rows ?? [] }),
        run: async () => ({
          meta: { changes: options.changes ?? 1, last_row_id: options.lastRowId ?? 11 },
        }),
      };
      statements.push(record);
      return statement;
    },
  };
  return { env: { DB: db } as unknown as Env, statements };
}

function makeBucket(): {
  bucket: R2Bucket;
  put: Array<{ key: string; size: number; type: string }>;
  deleted: string[];
} {
  const put: Array<{ key: string; size: number; type: string }> = [];
  const deleted: string[] = [];
  const bucket = {
    put: async (
      key: string,
      data: ArrayBuffer,
      init?: { httpMetadata?: { contentType?: string } },
    ) => {
      put.push({ key, size: data.byteLength, type: init?.httpMetadata?.contentType ?? "" });
      return {};
    },
    get: async (key: string) =>
      key.includes("gone") ? null : { body: new Blob([new Uint8Array([1, 2, 3])]).stream() },
    delete: async (key: string) => {
      deleted.push(key);
    },
  } as unknown as R2Bucket;
  return { bucket, put, deleted };
}

const THREAD_ROW = {
  id: 5,
  group_key: "task",
  subgroup: "R2",
  title: "Бакет",
  status: "doing",
  turn: "buffy",
  tags: '["r2","files"]',
  due_at: null,
  priority: 2,
  created_at: "2026-11-15 10:00:00",
  updated_at: "2026-11-15 10:00:00",
  last_entry_at: "2026-11-15 10:00:00",
  archived_at: null,
  entries: 2,
  unread: 1,
};

function jsonRequest(path: string, body?: unknown, method = "POST"): Request {
  return new Request(`https://api.example.com/api/admin/desk/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Теги нормалізуються тим самим правилом, що й у нотатках, — тому окремо. */
const buildThread = (body: Record<string, unknown>) =>
  buildThreadInput(body, sanitizeTags(body.tags));

const last = (statements: Captured[], keyword: string): Captured => {
  const match = [...statements]
    .reverse()
    .find((item) => item.sql.trimStart().toUpperCase().startsWith(keyword));
  if (!match) throw new Error(`немає запиту ${keyword}`);
  return match;
};

describe("санітайзери", () => {
  it("заголовок — один рядок, довгий обрізається", () => {
    expect(sanitizeTitle("  Макет \n столу ")).toBe("Макет столу");
    expect(sanitizeTitle(42)).toBe("");
    expect(sanitizeTitle("я".repeat(500)).length).toBe(200);
  });

  it("дата боргу — лише рррр-мм-дд", () => {
    expect(sanitizeDueAt("2026-11-30")).toBe("2026-11-30");
    expect(sanitizeDueAt("30.11.2026")).toBeNull();
    expect(sanitizeDueAt(null)).toBeNull();
  });

  it("пріоритет — 0/1/2, решта нуль", () => {
    expect(sanitizePriority(2)).toBe(2);
    expect(sanitizePriority("1")).toBe(1);
    expect(sanitizePriority(7)).toBe(0);
  });

  it("meta — об'єкт, а масив чи рядок стають порожніми", () => {
    expect(sanitizeMeta({ sum: 10 })).toEqual({ sum: 10 });
    expect(sanitizeMeta([1, 2])).toEqual({});
    expect(sanitizeMeta("x")).toEqual({});
  });
});

describe("buildThreadInput", () => {
  it("без заголовка теми немає", () => {
    expect(buildThread({ title: "   " })).toBeNull();
  });

  it("завершена тема не має черги — хід скидається в none", () => {
    expect(buildThread({ title: "Готово", status: "done", turn: "buffy" })?.turn).toBe("none");
    expect(buildThread({ title: "Готово", status: "dropped", turn: "serhii" })?.turn).toBe("none");
  });

  it("хід лишається, поки тема жива", () => {
    expect(buildThread({ title: "В роботі", status: "doing", turn: "buffy" })?.turn).toBe("buffy");
  });

  it("невідомі ключі стають типовими, теги нормалізуються", () => {
    const input = buildThread({ title: "Тема", group: "nope", status: "nope", tags: ["#R2"] });
    expect(input?.group).toBe("plan");
    expect(input?.status).toBe("open");
    expect(input?.tags).toEqual(["r2"]);
  });
});

describe("buildEntryInput", () => {
  it("порожній текст не створює запису", () => {
    expect(buildEntryInput({ body: "  " })).toBeNull();
  });

  it("невідомий вид стає нотаткою, reply_to — лише додатний", () => {
    expect(buildEntryInput({ body: "текст", kind: "nope" })?.kind).toBe("note");
    expect(buildEntryInput({ body: "текст", reply_to: -3 })?.reply_to).toBeNull();
    expect(buildEntryInput({ body: "текст", reply_to: 4 })?.reply_to).toBe(4);
  });
});

describe("deskFileKey", () => {
  it("ключ лежить у просторі столу й не містить пробілів", () => {
    const key = deskFileKey(12, "Схема бази (v2).pdf");
    expect(key.startsWith("desk/12/")).toBe(true);
    expect(key).not.toMatch(/\s/);
    expect(key.endsWith("-v2-.pdf") || key.endsWith(".pdf")).toBe(true);
  });
});

describe("список тем", () => {
  it("віддає тему з тегами, числами записів і непрочитаним", async () => {
    const db = makeDb({
      rows: [THREAD_ROW],
    });
    const res = await handleDesk(jsonRequest("threads", undefined, "GET"), db.env, "threads");
    const body = (await res.json()) as { ok: boolean; threads: DeskThread[]; total: number };

    expect(res.status).toBe(200);
    expect(body.threads[0]).toMatchObject({
      id: 5,
      tags: ["r2", "files"],
      entries: 2,
      unread: 1,
      archived: false,
    });
    expect(body.total).toBe(1);
  });

  it("фільтри й пошук стають умовами SQL, а не рядком у назві", async () => {
    const db = makeDb({ rows: [] });
    await handleDesk(
      jsonRequest("threads?group=task&status=doing&turn=buffy&q=r2", undefined, "GET"),
      db.env,
      "threads",
    );

    const select = db.statements.find((item) => item.sql.includes("FROM desk_threads"))!;
    expect(select.sql).toContain("t.group_key = ?");
    expect(select.sql).toContain("t.turn = ?");
    expect(select.sql).toContain("LOWER(t.title) LIKE ?");
    // side (unread), side (join), group, status, turn, три LIKE, LIMIT
    expect(select.binds).toEqual([
      "serhii",
      "serhii",
      "task",
      "doing",
      "buffy",
      "%r2%",
      "%r2%",
      "%r2%",
      200,
    ]);
  });
});

describe("тема", () => {
  it("GET без id — 400", async () => {
    const db = makeDb();
    const res = await handleDesk(jsonRequest("thread", undefined, "GET"), db.env, "thread");
    expect(res.status).toBe(400);
  });

  it("GET неіснуючої теми — 404", async () => {
    const db = makeDb({ row: null });
    const res = await handleDesk(jsonRequest("thread?id=99", undefined, "GET"), db.env, "thread");
    expect(res.status).toBe(404);
  });

  it("GET віддає стрічку й файли", async () => {
    const db = makeDb({ row: THREAD_ROW });
    (db.env.DB as unknown as { prepare: (sql: string) => unknown }).prepare = (sql: string) => {
      (db.statements as Captured[]).push({ sql, binds: [] });
      const statement = {
        bind: () => statement,
        first: async () => THREAD_ROW,
        all: async () => ({
          results: sql.includes("desk_entries")
            ? [
                {
                  id: 1,
                  thread_id: 5,
                  author: "buffy",
                  kind: "answer",
                  body: "Ок",
                  meta: '{"a":1}',
                },
              ]
            : [
                {
                  id: 9,
                  thread_id: 5,
                  entry_id: 1,
                  author: "buffy",
                  name: "x.pdf",
                  mime: "application/pdf",
                  bytes: 12,
                },
              ],
        }),
        run: async () => ({ meta: { changes: 1, last_row_id: 1 } }),
      };
      return statement;
    };

    const res = await handleDesk(jsonRequest("thread?id=5", undefined, "GET"), db.env, "thread");
    const body = (await res.json()) as {
      entries: DeskEntry[];
      files: Array<{ name: string }>;
    };
    expect(body.entries[0].meta).toEqual({ a: 1 });
    expect(body.files[0].name).toBe("x.pdf");
  });

  it("POST без заголовка — 400 і жодного INSERT", async () => {
    const db = makeDb();
    const res = await handleDesk(jsonRequest("thread", { title: " " }), db.env, "thread");
    expect(res.status).toBe(400);
    expect(db.statements.some((item) => item.sql.startsWith("INSERT"))).toBe(false);
  });

  it("POST створює тему й одразу позначає її вичитаною", async () => {
    const db = makeDb({ row: THREAD_ROW, lastRowId: 5 });
    await handleDesk(
      jsonRequest("thread", {
        title: "Нова",
        group: "debt",
        tags: ["#Гроші"],
        due_at: "2026-12-01",
      }),
      db.env,
      "thread",
    );

    const insert = db.statements.find((item) => item.sql.includes("INTO desk_threads"))!;
    expect(insert).toBeTruthy();
    expect(insert.binds.slice(0, 5)).toEqual(["debt", "", "Нова", "open", "none"]);
    expect(insert.binds[5]).toBe('["гроші"]');
    expect(insert.binds[6]).toBe("2026-12-01");
    expect(db.statements.some((item) => item.sql.includes("INTO desk_reads"))).toBe(true);
  });
});

describe("запис", () => {
  it("порожній текст — 400", async () => {
    const db = makeDb();
    const res = await handleDesk(
      jsonRequest("entry", { thread_id: 5, body: " " }),
      db.env,
      "entry",
    );
    expect(res.status).toBe(400);
  });

  it("без теми — 400", async () => {
    const db = makeDb();
    const res = await handleDesk(jsonRequest("entry", { body: "текст" }), db.env, "entry");
    expect(res.status).toBe(400);
  });

  it("неіснуюча тема — 404", async () => {
    const db = makeDb({ row: null });
    const res = await handleDesk(
      jsonRequest("entry", { thread_id: 5, body: "текст" }),
      db.env,
      "entry",
    );
    expect(res.status).toBe(404);
  });

  it("новий запис рухає last_entry_at, але не чіпає хід", async () => {
    const db = makeDb({ row: { id: 5 } });
    await handleDesk(
      jsonRequest("entry", { thread_id: 5, body: "  Привіт  ", kind: "question" }),
      db.env,
      "entry",
    );

    const insert = last(db.statements, "INSERT");
    expect(insert.sql).toContain("INTO desk_entries");
    // thread_id, author, kind, body, meta, reply_to, created_at
    expect(insert.binds.slice(0, 4)).toEqual([5, "serhii", "question", "Привіт"]);
    const update = last(db.statements, "UPDATE");
    expect(update.sql).toContain("last_entry_at");
    expect(update.sql).not.toContain("turn");
  });

  it("правка ставить edited_at і не рухає стрічку", async () => {
    const db = makeDb({ row: { id: 5 } });
    await handleDesk(
      jsonRequest("entry", { thread_id: 5, id: 3, body: "Виправлено" }),
      db.env,
      "entry",
    );
    expect(db.statements.some((item) => item.sql.includes("edited_at"))).toBe(true);
    // Правка не має рухати стрічку: UPDATE з `last_entry_at` не існує.
    expect(
      db.statements.some(
        (item) => item.sql.startsWith("UPDATE") && item.sql.includes("last_entry_at"),
      ),
    ).toBe(false);
  });

  it("видалення запису прибирає його файли з R2", async () => {
    const { bucket, deleted } = makeBucket();
    const db = makeDb({ rows: [{ id: 1, r2_key: "desk/5/abc-x.pdf" }] });
    const env = { ...db.env, DESK_FILES: bucket } as Env;

    const res = await handleDesk(jsonRequest("entry?id=3", undefined, "DELETE"), env, "entry");
    expect(res.status).toBe(200);
    expect(deleted).toEqual(["desk/5/abc-x.pdf"]);
  });
});

describe("прочитане", () => {
  it("позначка тільки росте", async () => {
    const db = makeDb();
    const res = await handleDesk(
      jsonRequest("read", { thread_id: 5, last_seen_entry_id: 12 }),
      db.env,
      "read",
    );
    expect(res.status).toBe(200);
    const upsert = last(db.statements, "INSERT");
    expect(upsert.sql).toContain("INTO desk_reads");
    expect(upsert.sql).toContain("MAX(last_seen_entry_id");
    expect(upsert.binds.slice(0, 3)).toEqual(["serhii", 5, 12]);
  });
});

describe("файли", () => {
  function upload(env: Env, options: { thread?: string; size?: number } = {}): Promise<Response> {
    const form = new FormData();
    form.set("thread", options.thread ?? "5");
    form.set(
      "file",
      new File([new Uint8Array(options.size ?? 8)], "схема.pdf", { type: "application/pdf" }),
    );
    return handleDesk(
      new Request("https://api.example.com/api/admin/desk/file", { method: "POST", body: form }),
      env,
      "file",
    );
  }

  it("без бакета — 503, а не мовчазна втрата", async () => {
    const db = makeDb({ row: { id: 5 } });
    const res = await upload(db.env);
    expect(res.status).toBe(503);
  });

  it("завеликий файл — 413 і жодного запису", async () => {
    const { bucket } = makeBucket();
    const db = makeDb({ row: { id: 5 } });
    const res = await upload({ ...db.env, DESK_FILES: bucket } as Env, { size: 21 * 1024 * 1024 });
    expect(res.status).toBe(413);
  });

  it("спершу об'єкт, потім рядок — і ключ у просторі теми", async () => {
    const { bucket, put } = makeBucket();
    const db = makeDb({ row: { id: 5 } });
    const res = await upload({ ...db.env, DESK_FILES: bucket } as Env);

    expect(res.status).toBe(200);
    expect(put).toHaveLength(1);
    expect(put[0].key.startsWith("desk/5/")).toBe(true);
    expect(put[0].type).toBe("application/pdf");
    const insert = last(db.statements, "INSERT");
    expect(insert.sql).toContain("INTO desk_files");
    expect(insert.binds[3]).toBe("схема.pdf");
  });

  it("віддача байтів — із типом і приватним кешем", async () => {
    const { bucket } = makeBucket();
    const db = makeDb({
      row: { name: "схема.pdf", mime: "application/pdf", r2_key: "desk/5/abc" },
    });
    const env = { ...db.env, DESK_FILES: bucket } as Env;

    const res = await handleDesk(jsonRequest("file?id=9", undefined, "GET"), env, "file");
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Cache-Control")).toContain("private");
    // Ім'я в заголовку — у percent-encoding, щоб кирилиця пережила будь-який клієнт.
    expect(res.headers.get("Content-Disposition")).toContain("filename*=UTF-8''");
  });

  it("рядок без об'єкта — 404, а не порожній файл", async () => {
    const { bucket } = makeBucket();
    const db = makeDb({ row: { name: "x", mime: "", r2_key: "desk/5/gone" } });
    const env = { ...db.env, DESK_FILES: bucket } as Env;

    const res = await handleDesk(jsonRequest("file?id=9", undefined, "GET"), env, "file");
    expect(res.status).toBe(404);
  });

  it("видалення: рядок спершу, об'єкт потім", async () => {
    const { bucket, deleted } = makeBucket();
    const db = makeDb({ row: { r2_key: "desk/5/abc-x.pdf" } });
    const env = { ...db.env, DESK_FILES: bucket } as Env;

    const res = await handleDesk(jsonRequest("file?id=9", undefined, "DELETE"), env, "file");
    expect(res.status).toBe(200);
    expect(db.statements.some((item) => item.sql.startsWith("DELETE FROM desk_files"))).toBe(true);
    expect(deleted).toEqual(["desk/5/abc-x.pdf"]);
  });
});

describe("маршрути", () => {
  it("невідомий підшлях — 404", async () => {
    const db = makeDb();
    const res = await handleDesk(jsonRequest("nope", undefined, "GET"), db.env, "nope");
    expect(res.status).toBe(404);
  });

  it("чужий метод на темах — 405", async () => {
    const db = makeDb();
    const res = await handleDesk(jsonRequest("thread", undefined, "DELETE"), db.env, "thread");
    expect(res.status).toBe(405);
  });
});
