/**
 * Межа наборів: **чия це ідентичність і що потрапляє в склад**. Без підписаного
 * `initData` ендпоінт не читає нічого; дата не у форматі `рррр-мм-дд` у набір
 * не потрапляє, інакше співставлення рахувалося б із порожнечі.
 *
 * @module api-dev/src/controllers/analysis-sets.controller.test
 */

import { describe, expect, it } from "vitest";
import type { Env } from "../shared/types";
import { INIT_DATA_HEADER } from "@wwwuabot/shared/security/telegram";
import { handleAnalysisSets } from "./analysis-sets.controller";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN";
const USER_ID = 777;

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

async function signedInitData(userId = USER_ID): Promise<string> {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    user: JSON.stringify({ id: userId, first_name: "Тест" }),
  });
  const checkString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), BOT_TOKEN);
  params.set("hash", toHex(await hmac(secret, checkString)));
  return params.toString();
}

interface Row {
  user_id: number;
  id: string;
  name: string;
  items: string;
  created_at: string;
  updated_at: string;
}

function makeEnv(rows: Row[] = []): Env {
  const db = {
    prepare(sql: string) {
      const record: { sql: string; binds: unknown[] } = { sql, binds: [] };
      const statement = {
        bind: (...args: unknown[]) => {
          record.binds = args;
          return statement;
        },
        first: async () => null,
        all: async () => {
          if (/PRAGMA|sqlite_master/.test(sql)) return { results: [] };
          const userId = record.binds[0];
          return { results: rows.filter((row) => row.user_id === userId) };
        },
        run: async () => {
          if (/^INSERT INTO analysis_sets/.test(sql)) {
            const [userId, id, name, items, createdAt] = record.binds as [
              number,
              string,
              string,
              string,
              string,
            ];
            const hit = rows.find((row) => row.user_id === userId && row.id === id);
            if (hit) {
              hit.name = name;
              hit.items = items;
            } else {
              rows.push({
                user_id: userId,
                id,
                name,
                items,
                created_at: createdAt,
                updated_at: createdAt,
              });
            }
          }
          if (/^DELETE FROM analysis_sets/.test(sql)) {
            const [userId, id] = record.binds as [number, string];
            const before = rows.length;
            for (let index = rows.length - 1; index >= 0; index--) {
              if (rows[index].user_id === userId && rows[index].id === id) rows.splice(index, 1);
            }
            return { meta: { changes: before - rows.length } };
          }
          return { meta: { changes: 1 } };
        },
      };
      return statement;
    },
  };

  return { DB: db, BOT_TOKEN } as unknown as Env;
}

function call(
  env: Env,
  method: string,
  body?: unknown,
  headers: Record<string, string> = {},
  query = "",
): Promise<Response> {
  return handleAnalysisSets(
    new Request(`https://api.example.com/api/analysis-sets${query ? `?${query}` : ""}`, {
      method,
      headers: { "Content-Type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env,
  );
}

describe("набори: ідентичність і склад", () => {
  it("без підписаного initData не віддає список", async () => {
    const response = await call(makeEnv(), "GET");
    expect(response.status).toBe(401);
  });

  it("записує набір і повертає його в списку", async () => {
    const env = makeEnv();
    const auth = { [INIT_DATA_HEADER]: await signedInitData() };

    const created = await call(
      env,
      "PUT",
      {
        id: "a1",
        name: "Команда",
        items: [
          { date: "1980-03-03", name: "Олена" },
          { date: "1991-12-31", name: "" },
        ],
      },
      auth,
    );
    expect(created.status).toBe(200);

    const list = await call(env, "GET", undefined, auth);
    const data = (await list.json()) as { sets: Array<{ name: string; items: unknown[] }> };
    expect(data.sets).toHaveLength(1);
    expect(data.sets[0].name).toBe("Команда");
    expect(data.sets[0].items).toHaveLength(2);
  });

  it("дата не у форматі не потрапляє в склад", async () => {
    const env = makeEnv();
    const auth = { [INIT_DATA_HEADER]: await signedInitData() };

    await call(env, "PUT", { id: "a1", name: "Набір", items: [{ date: "03.03.1980" }] }, auth);

    const list = await call(env, "GET", undefined, auth);
    const data = (await list.json()) as { sets: Array<{ items: unknown[] }> };
    expect(data.sets[0].items).toEqual([]);
  });

  it("видаляє набір і відповідає 404 на неіснуючий", async () => {
    const env = makeEnv();
    const auth = { [INIT_DATA_HEADER]: await signedInitData() };
    await call(env, "PUT", { id: "a1", name: "Набір", items: [] }, auth);

    const removed = await call(env, "DELETE", undefined, auth, "id=a1");
    expect(removed.status).toBe(200);

    const again = await call(env, "DELETE", undefined, auth, "id=a1");
    expect(again.status).toBe(404);
  });

  it("без номера не записує й не видаляє", async () => {
    const env = makeEnv();
    const auth = { [INIT_DATA_HEADER]: await signedInitData() };

    expect((await call(env, "PUT", { name: "Без номера" }, auth)).status).toBe(400);
    expect((await call(env, "DELETE", undefined, auth)).status).toBe(400);
  });
});
