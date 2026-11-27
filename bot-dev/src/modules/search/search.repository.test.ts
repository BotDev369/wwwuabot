import { describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types/env";
import { searchIndexKey, loadSearchIndex } from "./search.repository";

/** D1 для `ensureDefaultTenant`: головний проєкт уже є, номер — 1. */
function fakeDb(): unknown {
  const statement = {
    bind: () => statement,
    first: async () => ({ id: 1 }),
    all: async () => ({ results: [] }),
    run: async () => ({ success: true }),
  };
  return { prepare: () => statement };
}

function envWith(kv: unknown): Env {
  return { CONTENT_KV: kv, DB: fakeDb() } as unknown as Env;
}

describe("loadSearchIndex", () => {
  it("читає індекс одним ключем", async () => {
    const get = vi.fn(async () => ({ builtAt: "now", entries: [] }));
    expect(await loadSearchIndex(envWith({ get }))).toEqual({ builtAt: "now", entries: [] });
    expect(get).toHaveBeenCalledWith(searchIndexKey(1), "json");
  });

  it("без біндингу KV пошуку немає", async () => {
    expect(await loadSearchIndex({} as Env)).toBeNull();
  });

  it("порожній ключ і не-масив entries — це відсутній індекс", async () => {
    expect(await loadSearchIndex(envWith({ get: async () => null }))).toBeNull();
    expect(await loadSearchIndex(envWith({ get: async () => ({ entries: "x" }) }))).toBeNull();
  });

  it("збій KV не валить обробку апдейта", async () => {
    const get = async () => {
      throw new Error("kv down");
    };
    expect(await loadSearchIndex(envWith({ get }))).toBeNull();
  });
});
