/**
 * Контролер оголошень — **поверхні й коди відповідей**, а не межа тіла.
 *
 * Ідентичність тут замінена заглушкою: її справжню перевірку тримає
 * `shared/identity.test.ts`, а цей файл питає про інше — що «немає» й «чуже»
 * дають **однаковий** `404` (код відповіді теж сказав би, що чуже оголошення
 * існує), що дошка не питає власника і що `405` стоїть на всьому, чого в
 * адресі немає.
 *
 * @module api-dev/src/controllers/ads.controller.surfaces.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const h = vi.hoisted(() => ({
  authorized: true,
  ads: { listOwn: vi.fn(), save: vi.fn(), remove: vi.fn(), board: vi.fn() },
  validate: vi.fn(),
}));

vi.mock("../shared/identity", () => ({
  resolveUserId: async () =>
    h.authorized
      ? { ok: true as const, userId: 777 }
      : { ok: false as const, response: new Response(null, { status: 401 }) },
}));

vi.mock("@wwwuabot/shared/ads", () => ({ validateAd: h.validate }));

vi.mock("../services/ads.service", () => ({
  AdsService: class {
    listOwn = h.ads.listOwn;
    save = h.ads.save;
    remove = h.ads.remove;
    board = h.ads.board;
  },
}));

const { handleUserAds, handlePublicAds } = await import("./ads.controller");

const ENV = {} as Env;
const AD = { id: 1, ownerId: 777 };

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
  h.validate.mockReturnValue({ ok: true, value: { kind: "sell" } });
  h.ads.listOwn.mockResolvedValue([AD]);
  h.ads.save.mockResolvedValue(AD);
  h.ads.remove.mockResolvedValue(true);
  h.ads.board.mockResolvedValue([AD]);
});

describe("власні оголошення", () => {
  it("без ідентичності нічого не віддає й не пише", async () => {
    h.authorized = false;
    const res = await handleUserAds(request("GET", "/api/user/ads"), ENV);

    expect(res.status).toBe(401);
    expect(h.ads.listOwn).not.toHaveBeenCalled();
  });

  it("GET віддає власний список разом із чернетками", async () => {
    const res = await handleUserAds(request("GET", "/api/user/ads"), ENV);

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, ads: [AD] });
    expect(h.ads.listOwn).toHaveBeenCalledWith(777);
  });

  it("POST без номера створює нове", async () => {
    const res = await handleUserAds(request("POST", "/api/user/ads", { title: "Кава" }), ENV);

    expect(await res.json()).toEqual({ ok: true, ad: AD });
    expect(h.ads.save).toHaveBeenCalledWith(777, { kind: "sell" }, undefined);
  });

  it("POST із додатним номером править саме його", async () => {
    await handleUserAds(request("POST", "/api/user/ads", { id: 5, title: "Кава" }), ENV);

    expect(h.ads.save).toHaveBeenCalledWith(777, { kind: "sell" }, 5);
  });

  it("бите тіло відсікається як 400", async () => {
    const res = await handleUserAds(request("POST", "/api/user/ads", "{"), ENV);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Invalid JSON" });
    expect(h.ads.save).not.toHaveBeenCalled();
  });

  it("зміст відмови віддає спільне правило", async () => {
    h.validate.mockReturnValue({ ok: false, message: "Порожньо" });
    const res = await handleUserAds(request("POST", "/api/user/ads", {}), ENV);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Порожньо" });
  });

  it("правка, що нічого не зачепила, — 404, а не 200", async () => {
    h.ads.save.mockResolvedValue(null);
    const res = await handleUserAds(request("POST", "/api/user/ads", { id: 9 }), ENV);

    expect(res.status).toBe(404);
  });

  it("DELETE без номера — 400 і жодного запису", async () => {
    const res = await handleUserAds(request("DELETE", "/api/user/ads"), ENV);

    expect(res.status).toBe(400);
    expect(h.ads.remove).not.toHaveBeenCalled();
  });

  it("DELETE прибирає своє за номером", async () => {
    const res = await handleUserAds(request("DELETE", "/api/user/ads?id=4"), ENV);

    expect(await res.json()).toEqual({ ok: true, id: 4 });
    expect(h.ads.remove).toHaveBeenCalledWith(4, 777);
  });

  it("DELETE того, чого немає, — 404", async () => {
    h.ads.remove.mockResolvedValue(false);
    const res = await handleUserAds(request("DELETE", "/api/user/ads?id=4"), ENV);

    expect(res.status).toBe(404);
  });

  it("метод, якого тут немає, — 405", async () => {
    const res = await handleUserAds(request("PUT", "/api/user/ads"), ENV);

    expect(res.status).toBe(405);
  });

  it("збій сховища — 500 без подробиць", async () => {
    h.ads.listOwn.mockRejectedValue(new Error("D1 down"));
    const res = await handleUserAds(request("GET", "/api/user/ads"), ENV);

    expect(res.status).toBe(500);
  });
});

describe("дошка", () => {
  it("віддає показане іншими без власника в запиті", async () => {
    const res = await handlePublicAds(request("GET", "/api/public/ads?limit=10"), ENV);

    expect(await res.json()).toEqual({ ok: true, ads: [AD] });
    expect(h.ads.board).toHaveBeenCalledWith("10");
  });

  it("збій сховища — 500", async () => {
    h.ads.board.mockRejectedValue(new Error("D1 down"));
    const res = await handlePublicAds(request("GET", "/api/public/ads"), ENV);

    expect(res.status).toBe(500);
  });
});
