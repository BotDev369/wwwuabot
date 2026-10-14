/**
 * Контролер схем теми — **поверхні й коди відповідей**.
 *
 * «Немає» й «чуже» дають **однаковий** `404`: код відповіді теж сказав би, що
 * чужа схема існує. Ідентичність замінена заглушкою: її тримає
 * `shared/identity.test.ts`.
 *
 * @module api-dev/src/controllers/themes.controller.surfaces.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const h = vi.hoisted(() => ({
  authorized: true,
  themes: { listOwn: vi.fn(), save: vi.fn(), remove: vi.fn(), listShared: vi.fn() },
  validate: vi.fn(),
}));

vi.mock("../shared/identity", () => ({
  resolveUserId: async () =>
    h.authorized
      ? { ok: true as const, userId: 777 }
      : { ok: false as const, response: new Response(null, { status: 401 }) },
}));

vi.mock("@wwwuabot/shared/themes", () => ({ validateThemeScheme: h.validate }));

vi.mock("../services/themes.service", () => ({
  ThemesService: class {
    listOwn = h.themes.listOwn;
    save = h.themes.save;
    remove = h.themes.remove;
    listShared = h.themes.listShared;
  },
}));

const { handleUserThemes, handlePublicThemes } = await import("./themes.controller");

const ENV = {} as Env;
const SCHEME = { id: 1, name: "Моя" };

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
  h.validate.mockReturnValue({ ok: true, value: { name: "Моя", id: 5 } });
  h.themes.listOwn.mockResolvedValue([SCHEME]);
  h.themes.save.mockResolvedValue(SCHEME);
  h.themes.remove.mockResolvedValue(true);
  h.themes.listShared.mockResolvedValue([SCHEME]);
});

describe("власна бібліотека", () => {
  it("без ідентичності нічого не віддає", async () => {
    h.authorized = false;
    const res = await handleUserThemes(request("GET", "/api/user/themes"), ENV);

    expect(res.status).toBe(401);
    expect(h.themes.listOwn).not.toHaveBeenCalled();
  });

  it("GET віддає власні схеми разом із закритими", async () => {
    const res = await handleUserThemes(request("GET", "/api/user/themes"), ENV);

    expect(await res.json()).toEqual({ ok: true, themes: [SCHEME] });
    expect(h.themes.listOwn).toHaveBeenCalledWith(777);
  });

  it("POST зберігає схему разом із її номером", async () => {
    const res = await handleUserThemes(request("POST", "/api/user/themes", { name: "Моя" }), ENV);

    expect(await res.json()).toEqual({ ok: true, theme: SCHEME });
    expect(h.themes.save).toHaveBeenCalledWith(777, { name: "Моя", id: 5 }, 5);
  });

  it("зміст відмови віддає спільне правило", async () => {
    h.validate.mockReturnValue({ ok: false, message: "Немає кольорів" });
    const res = await handleUserThemes(request("POST", "/api/user/themes", {}), ENV);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Немає кольорів" });
  });

  it("бите тіло відсікається як 400", async () => {
    const res = await handleUserThemes(request("POST", "/api/user/themes", "{"), ENV);

    expect(res.status).toBe(400);
    expect(h.themes.save).not.toHaveBeenCalled();
  });

  it("правка того, чого немає, — 404", async () => {
    h.themes.save.mockResolvedValue(null);
    const res = await handleUserThemes(request("POST", "/api/user/themes", { name: "x" }), ENV);

    expect(res.status).toBe(404);
  });

  it("DELETE без номера — 400", async () => {
    const res = await handleUserThemes(request("DELETE", "/api/user/themes"), ENV);

    expect(res.status).toBe(400);
    expect(h.themes.remove).not.toHaveBeenCalled();
  });

  it("DELETE того, чого немає, — 404", async () => {
    h.themes.remove.mockResolvedValue(false);
    const res = await handleUserThemes(request("DELETE", "/api/user/themes?id=4"), ENV);

    expect(res.status).toBe(404);
  });

  it("DELETE прибирає свою схему", async () => {
    const res = await handleUserThemes(request("DELETE", "/api/user/themes?id=4"), ENV);

    expect(await res.json()).toEqual({ ok: true, id: 4 });
    expect(h.themes.remove).toHaveBeenCalledWith(4, 777);
  });

  it("метод, якого тут немає, — 405", async () => {
    const res = await handleUserThemes(request("PUT", "/api/user/themes"), ENV);

    expect(res.status).toBe(405);
  });

  it("збій сховища — 500", async () => {
    h.themes.listOwn.mockRejectedValue(new Error("D1 down"));
    const res = await handleUserThemes(request("GET", "/api/user/themes"), ENV);

    expect(res.status).toBe(500);
  });
});

describe("спільна бібліотека", () => {
  it("віддає відкриті схеми без авторизації", async () => {
    const res = await handlePublicThemes(request("GET", "/api/public/themes?limit=10"), ENV);

    expect(await res.json()).toEqual({ ok: true, themes: [SCHEME] });
    expect(h.themes.listShared).toHaveBeenCalledWith("10");
  });

  it("збій сховища — 500", async () => {
    h.themes.listShared.mockRejectedValue(new Error("D1 down"));
    const res = await handlePublicThemes(request("GET", "/api/public/themes"), ENV);

    expect(res.status).toBe(500);
  });
});
