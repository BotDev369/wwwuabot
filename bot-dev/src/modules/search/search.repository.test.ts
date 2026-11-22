import { describe, expect, it, vi } from "vitest";
import type { Env } from "../../shared/types/env";
import { SEARCH_INDEX_KEY, loadSearchIndex } from "./search.repository";

function envWith(kv: unknown): Env {
  return { CONTENT_KV: kv } as unknown as Env;
}

describe("loadSearchIndex", () => {
  it("читає індекс одним ключем", async () => {
    const get = vi.fn(async () => ({ builtAt: "now", entries: [] }));
    expect(await loadSearchIndex(envWith({ get }))).toEqual({ builtAt: "now", entries: [] });
    expect(get).toHaveBeenCalledWith(SEARCH_INDEX_KEY, "json");
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
