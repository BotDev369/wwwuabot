/**
 * Контролер сторінок — **поверхні й коди відповідей**.
 *
 * Зайнята адреса — `409` (людина обере іншу), а «немає» й «чуже» — **однаково**
 * `404`: різниця між ними сама сказала б, що чужа сторінка існує. Ідентичність
 * замінена заглушкою — її тримає `shared/identity.test.ts`.
 *
 * @module api-dev/src/controllers/pages.controller.surfaces.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const h = vi.hoisted(() => ({
  authorized: true,
  pages: { listManaged: vi.fn(), save: vi.fn(), remove: vi.fn(), listPublished: vi.fn() },
  validate: vi.fn(),
}));

vi.mock("../shared/identity", () => ({
  resolveUserId: async () =>
    h.authorized
      ? { ok: true as const, userId: 777 }
      : { ok: false as const, response: new Response(null, { status: 401 }) },
}));

vi.mock("@wwwuabot/shared/pages", () => ({ validatePageDraft: h.validate }));

vi.mock("../services/pages.service", () => ({
  PagesService: class {
    listManaged = h.pages.listManaged;
    save = h.pages.save;
    remove = h.pages.remove;
    listPublished = h.pages.listPublished;
  },
}));

const { handleUserPages, handlePublicPages } = await import("./pages.controller");

const ENV = {} as Env;
const PAGE = { id: 1, title: "Про мене" };

function request(method: string, url: string, body?: unknown): Request {
  const payload =
    typeof body === "string" ? body : body === undefined ? undefined : JSON.stringify(body);
  return new Request(`https://api.test${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: payload,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.authorized = true;
  h.validate.mockReturnValue({ ok: true, value: { title: "Про мене" } });
  h.pages.listManaged.mockResolvedValue([PAGE]);
  h.pages.save.mockResolvedValue({ kind: "ok", page: PAGE });
  h.pages.remove.mockResolvedValue(true);
  h.pages.listPublished.mockResolvedValue([PAGE]);
});

describe("власні сторінки", () => {
  it("без ідентичності нічого не віддає", async () => {
    h.authorized = false;
    const res = await handleUserPages(request("GET", "/api/user/pages"), ENV);

    expect(res.status).toBe(401);
    expect(h.pages.listManaged).not.toHaveBeenCalled();
  });

  it("GET віддає те, що людина веде", async () => {
    const res = await handleUserPages(request("GET", "/api/user/pages"), ENV);

    expect(await res.json()).toEqual({ ok: true, pages: [PAGE] });
    expect(h.pages.listManaged).toHaveBeenCalledWith(777);
  });

  it("POST зберігає й віддає сторінку", async () => {
    const res = await handleUserPages(
      request("POST", "/api/user/pages", { title: "Про мене" }),
      ENV,
    );

    expect(await res.json()).toEqual({ ok: true, page: PAGE });
    expect(h.pages.save).toHaveBeenCalledWith(777, { title: "Про мене" }, undefined);
  });

  it("POST із номером править саме його", async () => {
    await handleUserPages(request("POST", "/api/user/pages", { id: 5 }), ENV);

    expect(h.pages.save).toHaveBeenCalledWith(777, { title: "Про мене" }, 5);
  });

  it("правка того, чого немає, — 404", async () => {
    h.pages.save.mockResolvedValue({ kind: "not_found" });
    const res = await handleUserPages(request("POST", "/api/user/pages", { id: 9 }), ENV);

    expect(res.status).toBe(404);
  });

  it("зайнята адреса — 409, бо людина може обрати іншу", async () => {
    h.pages.save.mockResolvedValue({ kind: "address_taken" });
    const res = await handleUserPages(request("POST", "/api/user/pages", {}), ENV);

    expect(res.status).toBe(409);
  });

  it("бите тіло відсікається як 400", async () => {
    const res = await handleUserPages(request("POST", "/api/user/pages", "{"), ENV);

    expect(res.status).toBe(400);
    expect(h.pages.save).not.toHaveBeenCalled();
  });

  it("зміст відмови віддає спільне правило", async () => {
    h.validate.mockReturnValue({ ok: false, message: "Порожньо" });
    const res = await handleUserPages(request("POST", "/api/user/pages", {}), ENV);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Порожньо" });
  });

  it("DELETE без номера — 400", async () => {
    const res = await handleUserPages(request("DELETE", "/api/user/pages"), ENV);

    expect(res.status).toBe(400);
    expect(h.pages.remove).not.toHaveBeenCalled();
  });

  it("DELETE прибирає своє", async () => {
    const res = await handleUserPages(request("DELETE", "/api/user/pages?id=4"), ENV);

    expect(await res.json()).toEqual({ ok: true, id: 4 });
    expect(h.pages.remove).toHaveBeenCalledWith(4, 777);
  });

  it("DELETE того, чого немає, — 404", async () => {
    h.pages.remove.mockResolvedValue(false);
    const res = await handleUserPages(request("DELETE", "/api/user/pages?id=4"), ENV);

    expect(res.status).toBe(404);
  });

  it("метод, якого тут немає, — 405", async () => {
    const res = await handleUserPages(request("PUT", "/api/user/pages"), ENV);

    expect(res.status).toBe(405);
  });

  it("збій сховища — 500", async () => {
    h.pages.listManaged.mockRejectedValue(new Error("D1 down"));
    const res = await handleUserPages(request("GET", "/api/user/pages"), ENV);

    expect(res.status).toBe(500);
  });
});

describe("відкриті сторінки", () => {
  it("віддає опубліковане без авторизації", async () => {
    const res = await handlePublicPages(request("GET", "/api/public/pages?limit=10"), ENV);

    expect(await res.json()).toEqual({ ok: true, pages: [PAGE] });
    expect(h.pages.listPublished).toHaveBeenCalledWith("10");
  });

  it("збій сховища — 500", async () => {
    h.pages.listPublished.mockRejectedValue(new Error("D1 down"));
    const res = await handlePublicPages(request("GET", "/api/public/pages"), ENV);

    expect(res.status).toBe(500);
  });
});
