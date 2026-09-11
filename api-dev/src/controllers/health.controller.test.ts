import { describe, it, expect } from "vitest";
import { handleHealth, handleDeepHealth } from "./health.controller";
import type { Env } from "../shared/types";

/**
 * Тести ендпоїнтів здоров'я.
 *
 * Головне, що тут захищається: `/health/deep` мусить ПАДАТИ (503), коли
 * падає залежність. Якщо він цього не робить, зовнішній монітор показує
 * «все добре» при мертвій базі — тобто моніторинг існує, але не працює.
 *
 * @module api-dev/src/controllers/health.controller.test
 */

let dbCalls = 0;

function makeEnv(opts: { dbFails?: boolean; kvFails?: boolean } = {}): Env {
  dbCalls = 0;
  return {
    DB: {
      prepare: () => {
        dbCalls++;
        return {
          first: async () => {
            if (opts.dbFails) throw new Error("D1_ERROR: no such table: users");
            return { 1: 1 };
          },
        };
      },
    } as unknown as D1Database,
    CONTENT_KV: {
      get: async () => {
        if (opts.kvFails) throw new Error("KV_ERROR: binding missing");
        return null;
      },
    } as unknown as KVNamespace,
  };
}

describe("GET /health", () => {
  it("віддає 200 і НЕ торкається залежностей", async () => {
    const res = handleHealth();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ status: "ok" });
  });

  it("не кешується — монітор мусить бачити свіжий стан", async () => {
    expect(handleHealth().headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("GET /health/deep", () => {
  it("200, коли обидві залежності живі", async () => {
    const res = await handleDeepHealth(makeEnv());
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      status: "ok",
      checks: { db: true, kv: true },
    });
  });

  it("⛔ 503, коли лежить D1", async () => {
    const res = await handleDeepHealth(makeEnv({ dbFails: true }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      status: "degraded",
      checks: { db: false, kv: true },
    });
  });

  it("⛔ 503, коли лежить KV", async () => {
    const res = await handleDeepHealth(makeEnv({ kvFails: true }));
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({
      status: "degraded",
      checks: { db: true, kv: false },
    });
  });

  it("⛔ не зливає текст помилки D1 у відповідь", async () => {
    const res = await handleDeepHealth(makeEnv({ dbFails: true }));
    const body = await res.text();
    expect(body).not.toContain("no such table");
    expect(body).not.toContain("users");
    expect(body).not.toContain("D1_ERROR");
  });

  it("робить рівно один запит до БД", async () => {
    await handleDeepHealth(makeEnv());
    expect(dbCalls).toBe(1);
  });
});
