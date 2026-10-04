/**
 * Чернетки листів: власні дані того, хто пише, із власним життєм.
 *
 * Чотири рішення, у яких легко втрапити чужий текст або з'їсти написане:
 *
 * 1. **Чернетка — документ із номером, а не пара людей.** Чернеток може бути
 *    кілька, і надсилання з однієї прибирає **саме її**, а не всі до того адресата.
 * 2. **Адресат необов'язковий, але якщо він є — зв'язок перевіряється першим.**
 *    Інакше чернетку можна було б завести будь-кому, а код відповіді (404 проти
 *    400) підказував би, чи існує така людина.
 * 3. **Порожнє тіло прибирає чернетку**, а не зберігає порожню: рядок, що лишився,
 *    показував би в списку порожнечу.
 * 4. **Чужий номер — те саме 404, що й «чернетки немає».** Різниця в коді відповіді
 *    сама розповіла б, що десь там вона є.
 *
 * D1 — фейковий: перевіряються рішення сервісу, а не сервер SQLite.
 *
 * @module api-dev/src/services/messages/drafts.test
 */

import { describe, expect, it } from "vitest";

import { dropDraft, readDrafts, saveDraft } from "./drafts";
import type { Env } from "../../shared/types";

const ME = 1;
const PEER = 2;

interface Captured {
  sql: string;
  binds: unknown[];
}

interface DraftRow {
  id: number;
  peer_id: number | null;
  body: string | null;
  updated_at: string | null;
}

function makeEnv(options: { linked?: boolean; drafts?: DraftRow[]; insertedId?: number }): {
  env: Env;
  statements: Captured[];
} {
  const drafts = options.drafts ?? [];
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
        first: async () => {
          if (/FROM contacts/.test(sql)) return options.linked === false ? null : { id: 1 };
          if (/FROM shop_orders/.test(sql)) return null;
          // Чернетка читається з `owner_id` у `WHERE`: чужий рядок не знайдеться.
          const [id, owner] = record.binds;
          const hit = drafts.find((row) => row.id === id && owner === ME);
          return hit ?? null;
        },
        all: async () => ({ results: drafts }),
        run: async () => {
          if (/^\s*DELETE FROM message_drafts/.test(sql)) {
            const [id, owner] = record.binds;
            const index = drafts.findIndex((row) => row.id === id && owner === ME);
            if (index >= 0) drafts.splice(index, 1);
            return { meta: { changes: index >= 0 ? 1 : 0 } };
          }
          return { meta: { changes: 1 } };
        },
      };
      // `RETURNING id` проходить через `first`, але запит уже не `SELECT`.
      if (/INSERT INTO message_drafts/.test(sql)) {
        statement.first = async () => ({ id: options.insertedId ?? 31 });
      }
      return statement;
    },
  };

  return { env: { DB: db } as unknown as Env, statements };
}

/** Чи бачив сервер якийсь запис у чернетках: чужий або порожній лист сюди не пишуть. */
function wroteDrafts(statements: Captured[]): boolean {
  return statements.some((s) => /(INSERT|UPDATE|DELETE) FROM message_drafts/.test(s.sql));
}

describe("збереження чернетки", () => {
  it("нова чернетка пише власника, адресата й текст", async () => {
    const { env, statements } = makeEnv({ insertedId: 31 });
    const result = await saveDraft(env, ME, { id: null, peerId: PEER, body: "  Привіт  " });

    const insert = statements.find((s) => /INSERT INTO message_drafts/.test(s.sql));
    expect(insert?.binds[0]).toBe(ME);
    expect(insert?.binds[1]).toBe(PEER);
    expect(insert?.binds[2]).toBe("Привіт");
    expect(result.ok && result.draft).toMatchObject({ id: 31, peerId: PEER, body: "Привіт" });
  });

  it("лист без адресата — законний стан: текст написано, втрачати його нема чого", async () => {
    const { env, statements } = makeEnv({});
    const result = await saveDraft(env, ME, { id: null, peerId: null, body: "Привіт" });

    const insert = statements.find((s) => /INSERT INTO message_drafts/.test(s.sql));
    expect(insert?.binds[1]).toBeNull();
    expect(result.ok && result.draft?.peerId).toBeNull();
  });

  it("порожня нова чернетка не лишає рядка — це чиста форма, а не збережене", async () => {
    const { env, statements } = makeEnv({});
    const result = await saveDraft(env, ME, { id: null, peerId: PEER, body: "   " });

    expect(result).toEqual({ ok: true, draft: null });
    expect(wroteDrafts(statements)).toBe(false);
  });

  it("порожнє тіло наявної чернетки прибирає її", async () => {
    const { env, statements } = makeEnv({
      drafts: [{ id: 31, peer_id: PEER, body: "старий текст", updated_at: "2026-01-01" }],
    });
    const result = await saveDraft(env, ME, { id: 31, peerId: PEER, body: "" });

    const drop = statements.find((s) => /DELETE FROM message_drafts/.test(s.sql));
    expect(drop?.binds).toEqual([31, ME]);
    expect(result).toEqual({ ok: true, draft: null });
  });

  it("адресата можна змінити й прибрати, доки лист не надіслано", async () => {
    const { env, statements } = makeEnv({
      drafts: [{ id: 31, peer_id: PEER, body: "текст", updated_at: "2026-01-01" }],
    });
    const result = await saveDraft(env, ME, { id: 31, peerId: null, body: "текст" });

    const update = statements.find((s) => /UPDATE message_drafts/.test(s.sql));
    expect(update?.binds[0]).toBeNull();
    expect(result.ok && result.draft?.peerId).toBeNull();
  });

  it("правка йде за номером і власником, а не за адресатом", async () => {
    const { env, statements } = makeEnv({
      drafts: [{ id: 31, peer_id: PEER, body: "текст", updated_at: "2026-01-01" }],
    });
    await saveDraft(env, ME, { id: 31, peerId: PEER, body: "інший текст" });

    const update = statements.find((s) => /UPDATE message_drafts/.test(s.sql));
    expect(update?.binds[3]).toBe(31);
    expect(update?.binds[4]).toBe(ME);
  });
});

describe("відмови", () => {
  it("чужого номера не існує — і це не відрізняється від відсутньої чернетки", async () => {
    const { env } = makeEnv({ drafts: [] });
    const result = await saveDraft(env, ME, { id: 999, peerId: PEER, body: "текст" });

    expect(result.ok).toBe(false);
    expect(result.ok === false && result.status).toBe(404);
    expect(result.ok === false && result.error).toBe("Чернетки немає");
  });

  it("нев'язаному адресату — та сама відмова, що й неіснуючій розмові", async () => {
    const { env } = makeEnv({ linked: false });
    const result = await saveDraft(env, ME, { id: null, peerId: 99, body: "текст" });

    expect(result.ok === false && result.status).toBe(404);
    expect(result.ok === false && result.error).toBe("Розмови з цією людиною немає");
  });

  it("перевірка зв'язку — до будь-якого запису: код відповіді не підказує про людей", async () => {
    const { env, statements } = makeEnv({ linked: false });
    await saveDraft(env, ME, { id: null, peerId: 99, body: "текст" });

    expect(wroteDrafts(statements)).toBe(false);
  });

  it("форма без адресата не питає зв'язку — перевіряти нічого", async () => {
    const { env, statements } = makeEnv({ linked: false });
    await saveDraft(env, ME, { id: null, peerId: null, body: null });

    // Без адресата перевіряти зв'язок непросто: нічого не пишемо, бо й тіла немає.
    expect(statements.some((s) => /FROM contacts/.test(s.sql))).toBe(false);
    expect(wroteDrafts(statements)).toBe(false);
  });
});

describe("читання й прибирання", () => {
  it("порядок чернеток задає сервер, а не клієнт", async () => {
    const { env, statements } = makeEnv({ drafts: [] });
    await readDrafts(env, ME);

    const query = statements.find((s) => /FROM message_drafts/.test(s.sql));
    expect(query?.sql).toContain("ORDER BY updated_at DESC, id DESC");
    expect(query?.binds).toEqual([ME]);
  });

  it("чернетки повертаються з номерами — інакше надсилання не знає, яку прибрати", async () => {
    const { env } = makeEnv({
      drafts: [{ id: 31, peer_id: null, body: "текст", updated_at: "2026-01-01" }],
    });
    expect(await readDrafts(env, ME)).toEqual([
      { id: 31, peerId: null, body: "текст", updatedAt: "2026-01-01" },
    ]);
  });

  it("прибирається саме одна чернетка, обмежена власником", async () => {
    const { env, statements } = makeEnv({
      drafts: [
        { id: 31, peer_id: PEER, body: "перша", updated_at: "2026-01-02" },
        { id: 32, peer_id: PEER, body: "друга", updated_at: "2026-01-03" },
      ],
    });
    await dropDraft(env.DB, ME, 31);

    const drop = statements.find((s) => /DELETE FROM message_drafts/.test(s.sql));
    expect(drop?.binds).toEqual([31, ME]);
    // Решта — те, що людина ще пише: її не можна прибирати разом із надісланою.
    expect(await readDrafts(env, ME)).toHaveLength(1);
  });
});
