import { describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const state = vi.hoisted(() => ({ fail: false }));

vi.mock("../services/search", () => ({
  rebuildSearchIndex: async () => {
    if (state.fail) throw new Error("db down");
    return { pages: 20, products: 21, builtAt: "2026-11-22T00:00:00.000Z" };
  },
}));

const { handleSearchReindex } = await import("./search.controller");

const request = () => new Request("https://api.test/api/admin/search/reindex", { method: "POST" });
const env = {} as Env;

describe("handleSearchReindex", () => {
  it("перебудова віддає лічильники й час", async () => {
    state.fail = false;
    const res = await handleSearchReindex(request(), env);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, pages: 20, products: 21 });
  });

  it("збій перебудови — 500 і жодного фальшивого «ok»", async () => {
    state.fail = true;
    const res = await handleSearchReindex(request(), env);
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ ok: false });
  });
});
