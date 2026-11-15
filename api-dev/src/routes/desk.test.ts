/**
 * Маршрути «Стола»: адреси ловляться рівно ті, які оголошені.
 *
 * Модуль тонкий, але важливий: якщо адреса зникне з нього, запит піде в SPA
 * адмінки й повернеться HTML замість 401 — тобто «нічого не знайшли» замість
 * «немає входу». Тому кожен шлях перевіряється окремо.
 *
 * @module api-dev/src/routes/desk.test
 */

import { describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const calls = vi.hoisted(() => ({ subs: [] as string[] }));

vi.mock("../controllers/desk.controller", () => ({
  handleDesk: async (_request: Request, _env: unknown, sub: string) => {
    calls.subs.push(sub);
    return new Response("ok");
  },
}));

const { matchDeskRoute } = await import("./desk");

const env = {} as Env;
const request = new Request("https://api.example.com/api/admin/desk/threads");

describe("matchDeskRoute", () => {
  it("кожна адреса веде у свій обробник", async () => {
    for (const [path, sub] of [
      ["/api/admin/desk/threads", "threads"],
      ["/api/admin/desk/thread", "thread"],
      ["/api/admin/desk/entry", "entry"],
      ["/api/admin/desk/read", "read"],
      ["/api/admin/desk/file", "file"],
    ]) {
      calls.subs = [];
      const response = await matchDeskRoute(request, env, path);
      expect(response).not.toBeNull();
      expect(calls.subs).toEqual([sub]);
    }
  });

  it("чужий шлях і схожий префікс лишаються чужими", () => {
    expect(matchDeskRoute(request, env, "/api/admin/desk")).toBeNull();
    expect(matchDeskRoute(request, env, "/api/admin/desk/files")).toBeNull();
    expect(matchDeskRoute(request, env, "/api/admin/notes")).toBeNull();
  });
});
