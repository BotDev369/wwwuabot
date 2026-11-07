/**
 * Маршрут екранів: свій префікс, ключ з адреси цілком, чужий шлях — `null`.
 *
 * @module api-dev/src/routes/screens.test
 */

import { describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const handlers = { handleScreenTexts: vi.fn() };
vi.mock("../controllers/screens.controller", () => handlers);

const { matchScreensRoute } = await import("./screens");

const ENV = {} as Env;

describe("GET /api/screens/:key", () => {
  it("віддає ключ контролеру разом із оточенням", async () => {
    handlers.handleScreenTexts.mockReturnValue(new Response("texts"));

    const response = await matchScreensRoute(ENV, "/api/screens/services");

    expect(await (response as Response).text()).toBe("texts");
    expect(handlers.handleScreenTexts).toHaveBeenCalledWith(ENV, "services");
  });

  it("битий percent-encoding — 400, а не похід у сховище", async () => {
    const response = await matchScreensRoute(ENV, "/api/screens/%E0%A4%A");

    expect((response as Response).status).toBe(400);
    expect(handlers.handleScreenTexts).not.toHaveBeenCalled();
  });

  it("чужий шлях лишається не нашим — роутер іде далі", () => {
    expect(matchScreensRoute(ENV, "/api/scenario/services")).toBeNull();
    expect(matchScreensRoute(ENV, "/api/screens")).toBeNull();
  });
});
