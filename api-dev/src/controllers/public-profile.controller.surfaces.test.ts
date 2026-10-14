/**
 * Контролер публічного профілю — **поверхні й коди відповідей**.
 *
 * Головне, що тримається тут: закритий профіль і неіснуючий віддають **той
 * самий** `404` — різні коди сказали б, що людина в нас є, але сховалась.
 * Ідентичність замінена заглушкою: її тримає `shared/identity.test.ts`.
 *
 * @module api-dev/src/controllers/public-profile.controller.surfaces.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const h = vi.hoisted(() => ({
  authorized: true,
  profile: {
    saveAbout: vi.fn(),
    saveVisibility: vi.fn(),
    listPublic: vi.fn(),
    readPublic: vi.fn(),
  },
}));

vi.mock("../shared/identity", () => ({
  resolveUserId: async () =>
    h.authorized
      ? { ok: true as const, userId: 777 }
      : { ok: false as const, response: new Response(null, { status: 401 }) },
}));

vi.mock("../services/public-profile.service", () => ({
  PublicProfileService: class {
    saveAbout = h.profile.saveAbout;
    saveVisibility = h.profile.saveVisibility;
    listPublic = h.profile.listPublic;
    readPublic = h.profile.readPublic;
  },
}));

const { handleUserAbout, handleUserVisibility, handlePublicUsers, handlePublicUser } =
  await import("./public-profile.controller");

const ENV = {} as Env;

function request(method: string, url: string, body?: unknown): Request {
  return new Request(`https://api.test${url}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.authorized = true;
  h.profile.saveAbout.mockResolvedValue({ ok: true, value: "Привіт" });
  h.profile.saveVisibility.mockResolvedValue({ about: "", isPublic: true, openFields: [] });
  h.profile.listPublic.mockResolvedValue([{ id: 1 }]);
  h.profile.readPublic.mockResolvedValue({ id: 1, about: "Привіт" });
});

describe("власні налаштування", () => {
  it("без ідентичності «Про себе» не зберігається", async () => {
    h.authorized = false;
    const res = await handleUserAbout(request("POST", "/api/user/about", { about: "x" }), ENV);

    expect(res.status).toBe(401);
    expect(h.profile.saveAbout).not.toHaveBeenCalled();
  });

  it("«Про себе» віддає збережений текст", async () => {
    const res = await handleUserAbout(
      request("POST", "/api/user/about", { about: " Привіт " }),
      ENV,
    );

    expect(await res.json()).toEqual({ ok: true, about: "Привіт" });
    expect(h.profile.saveAbout).toHaveBeenCalledWith(777, " Привіт ");
  });

  it("причину відмови «Про себе» віддає сервіс", async () => {
    h.profile.saveAbout.mockResolvedValue({ ok: false, message: "Занадто довго" });
    const res = await handleUserAbout(request("POST", "/api/user/about", { about: "x" }), ENV);

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Занадто довго" });
  });

  it("видимість передає список відкритих полів рядками", async () => {
    h.profile.saveVisibility.mockResolvedValue({
      about: "",
      isPublic: true,
      openFields: ["about"],
    });
    const res = await handleUserVisibility(
      request("POST", "/api/user/visibility", { public: true, fields: ["about", 7] }),
      ENV,
    );

    expect(res.status).toBe(200);
    expect(h.profile.saveVisibility).toHaveBeenCalledWith(777, {
      isPublic: true,
      fields: ["about", "7"],
    });
  });

  it("перемикач без списку лишає набір як є", async () => {
    await handleUserVisibility(request("POST", "/api/user/visibility", { public: false }), ENV);

    expect(h.profile.saveVisibility).toHaveBeenCalledWith(777, {
      isPublic: false,
      fields: undefined,
    });
  });

  it("збій запису видимості — 500", async () => {
    h.profile.saveVisibility.mockRejectedValue(new Error("D1 down"));
    const res = await handleUserVisibility(
      request("POST", "/api/user/visibility", { public: true }),
      ENV,
    );

    expect(res.status).toBe(500);
  });
});

describe("те, що бачать інші", () => {
  it("стрічка людей читається без авторизації", async () => {
    const res = await handlePublicUsers(request("GET", "/api/public/users?limit=10"), ENV);

    expect(await res.json()).toEqual({ ok: true, items: [{ id: 1 }] });
    expect(h.profile.listPublic).toHaveBeenCalledWith("10");
  });

  it("збій стрічки — 500", async () => {
    h.profile.listPublic.mockRejectedValue(new Error("D1 down"));
    const res = await handlePublicUsers(request("GET", "/api/public/users"), ENV);

    expect(res.status).toBe(500);
  });

  it("номер, який не є числом, — 400", async () => {
    const res = await handlePublicUser(request("GET", "/api/public/users/abc"), ENV, "abc");

    expect(res.status).toBe(400);
    expect(h.profile.readPublic).not.toHaveBeenCalled();
  });

  it("закритий профіль і неіснуючий — однаково 404", async () => {
    h.profile.readPublic.mockResolvedValue(null);
    const res = await handlePublicUser(request("GET", "/api/public/users/5"), ENV, "5");

    expect(res.status).toBe(404);
  });

  it("відкритий профіль віддається", async () => {
    const res = await handlePublicUser(request("GET", "/api/public/users/5"), ENV, "5");

    expect(await res.json()).toEqual({ ok: true, profile: { id: 1, about: "Привіт" } });
  });

  it("збій читання профілю — 500", async () => {
    h.profile.readPublic.mockRejectedValue(new Error("D1 down"));
    const res = await handlePublicUser(request("GET", "/api/public/users/5"), ENV, "5");

    expect(res.status).toBe(500);
  });
});
