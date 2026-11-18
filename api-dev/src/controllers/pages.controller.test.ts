/**
 * Сторінки — **лише читання**: список і відмова на запис.
 *
 * Найдорожча помилка тут — повернути можливість запису: `POST` і `DELETE`
 * мусять відповідати `405`, а не «заборонено роллю» чи, гірше, писати в базу.
 *
 * @module api-dev/src/controllers/pages.controller.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const identity = vi.fn();
const service = { listManaged: vi.fn() };

vi.mock("../shared/identity", () => ({ resolveUserId: (...args: unknown[]) => identity(...args) }));
vi.mock("../services/pages.service", () => ({
  PagesService: class {
    listManaged = service.listManaged;
  },
}));

const { handleUserPages } = await import("./pages.controller");

const ENV = {} as Env;

const request = (method: string, path: string): Request =>
  new Request(`https://api.example.com${path}`, { method });

beforeEach(() => {
  vi.clearAllMocks();
  identity.mockResolvedValue({ ok: true, userId: 42 });
  service.listManaged.mockResolvedValue([{ id: 7, title: "Моя візитка" }]);
});

describe("GET /api/user/pages", () => {
  it("віддає сторінки людини", async () => {
    const res = await handleUserPages(request("GET", "/api/user/pages"), ENV);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, pages: [{ id: 7, title: "Моя візитка" }] });
    expect(identity).toHaveBeenCalled();
  });

  it("без підписаного initData — відмова, а не порожній список", async () => {
    identity.mockResolvedValue({ ok: false, response: new Response("no", { status: 401 }) });

    const res = await handleUserPages(request("GET", "/api/user/pages"), ENV);

    expect(res.status).toBe(401);
    expect(service.listManaged).not.toHaveBeenCalled();
  });

  it("помилка бази — 500, а не порожній список", async () => {
    service.listManaged.mockRejectedValue(new Error("D1 down"));

    const res = await handleUserPages(request("GET", "/api/user/pages"), ENV);

    expect(res.status).toBe(500);
  });
});

describe("запису сторінок не існує", () => {
  it("POST — 405 і жодного запису", async () => {
    identity.mockResolvedValue({ ok: true, userId: 42 });

    const res = await handleUserPages(
      new Request("https://api.example.com/api/user/pages", {
        method: "POST",
        body: JSON.stringify({ id: 7, title: "Інша" }),
      }),
      ENV,
    );

    expect(res.status).toBe(405);
    expect(service.listManaged).not.toHaveBeenCalled();
  });

  it("DELETE — 405", async () => {
    const res = await handleUserPages(request("DELETE", "/api/user/pages?id=7"), ENV);

    expect(res.status).toBe(405);
  });

  it("PUT — 405", async () => {
    const res = await handleUserPages(request("PUT", "/api/user/pages"), ENV);

    expect(res.status).toBe(405);
  });
});
