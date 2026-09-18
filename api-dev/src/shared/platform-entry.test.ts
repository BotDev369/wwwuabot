/**
 * Вхід на платформу — чи ставиться дата взагалі й чи рівно раз.
 *
 * Це та частина, яку **не видно ні з екрана, ні з тестів контролера**: відмітка
 * стоїть на вході воркера, і якщо підпис `initData` не зійдеться чи забракне
 * заголовка, контакт назавжди лишиться «у боті» — без жодної помилки десь.
 * Тому тут перевіряються рівно три речі:
 *
 * 1. **Без підпису — нічого.** Голий заголовок (чи його відсутність) не має
 *    права ставити дати: це запис у чужі рядки.
 * 2. **З підписом — один `UPDATE`** з id людини й умовою «дата ще порожня».
 * 3. **Повтор не пише.** Запитів від людини багато, а подія — одна: той самий
 *    `userId` у межах інстансу воркера відмічається раз.
 *
 * Середовище — фейкова D1, яка лише записує SQL: справжня база тут не потрібна,
 * бо перевіряється рішення «писати чи ні», а не його результат у рядку.
 */

import { describe, expect, it } from "vitest";
import type { Env } from "./types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import { markEntryFromRequest } from "./platform-entry";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";

/** Виклики D1 у порядку надходження — саме вони й перевіряються. */
interface Captured {
  sql: string;
  binds: unknown[];
}

function fakeEnv(): { env: Env; statements: Captured[] } {
  const statements: Captured[] = [];

  const db = {
    prepare(sql: string) {
      const entry: Captured = { sql, binds: [] };
      statements.push(entry);
      const done = { results: [], success: true, meta: { changes: 1 } };
      const bound = {
        run: async () => done,
        all: async () => done,
        first: async () => null,
      };
      return {
        ...bound,
        bind: (...binds: unknown[]) => ({ ...bound, binds: (entry.binds = binds) }),
      };
    },
  } as unknown as D1Database;

  return { env: { DB: db, BOT_TOKEN } as unknown as Env, statements };
}

// ── Підпис initData ───────────────────────────────────────────────
// Копія зі тесту контролера навмисно: це фікстура, а не код продукту — у
// `shared/src` підписувач умів би підробити ідентичність.

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

function toHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function signedInitData(userId: number): Promise<string> {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Тест" }),
  });
  const checkString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), BOT_TOKEN);
  params.set("hash", toHex(await hmac(secret, checkString)));
  return params.toString();
}

function request(initData?: string): Request {
  const headers = new Headers();
  if (initData) headers.set(INIT_DATA_HEADER, initData);
  return new Request("https://api.example.com/api/contacts", { headers });
}

/** Чи була відмітка: `UPDATE` саме по входу на платформу. */
function marks(statements: Captured[]): Captured[] {
  return statements.filter((s) => /update contacts set joined_platform_at/i.test(s.sql));
}

describe("відмітка входу на платформу", () => {
  it("⛔ без підписаного initData нічого не пише", async () => {
    const { env, statements } = fakeEnv();

    await markEntryFromRequest(request(), env);
    // Заголовок є, підпису немає: `auth_date` без `hash` — саме те, що
    // надішле будь-хто, хто спробує «просто попросити» чужі рядки.
    await markEntryFromRequest(request("user=%7B%22id%22%3A1%7D&auth_date=1"), env);

    expect(statements).toHaveLength(0);
  });

  it("з підписом ставить дату людині за її id — і лише тим, хто прийшов за лінком", async () => {
    const { env, statements } = fakeEnv();

    await markEntryFromRequest(request(await signedInitData(700001)), env);

    const [mark] = marks(statements);
    expect(mark).toBeDefined();
    // Умова «ще порожня» стоїть у самому `UPDATE`, а не окремою перевіркою:
    // так повторний запит не переписує дату іншим часом.
    expect(mark.sql).toMatch(/joined_user_id = \? AND joined_platform_at IS NULL/);
    expect(mark.binds[2]).toBe(700001);
  });

  it("повторний запит тієї самої людини не пише вдруге", async () => {
    const { env, statements } = fakeEnv();
    const initData = await signedInitData(700002);

    await markEntryFromRequest(request(initData), env);
    await markEntryFromRequest(request(initData), env);
    await markEntryFromRequest(request(initData), env);

    expect(marks(statements)).toHaveLength(1);
  });

  it("іншій людині дата ставиться своєю відміткою", async () => {
    const { env, statements } = fakeEnv();

    await markEntryFromRequest(request(await signedInitData(700003)), env);
    await markEntryFromRequest(request(await signedInitData(700004)), env);

    expect(marks(statements).map((mark) => mark.binds[2])).toEqual([700003, 700004]);
  });
});
