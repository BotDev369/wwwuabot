/**
 * Контролер товарів — **поверхні й коди відповідей**.
 *
 * Зайнята адреса товару — `409` (людина обере іншу), а «немає» й «чуже» —
 * **однаково** `404`, бо різниця між ними сама сказала б, що чужий магазин існує.
 *
 * @module api-dev/src/controllers/shop.controller.surfaces.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const h = vi.hoisted(() => ({
  authorized: true,
  shop: { listOwn: vi.fn(), save: vi.fn(), remove: vi.fn(), catalog: vi.fn() },
  validate: vi.fn(),
}));

vi.mock("../shared/identity", () => ({
  resolveUserId: async () =>
    h.authorized
      ? { ok: true as const, userId: 777 }
      : { ok: false as const, response: new Response(null, { status: 401 }) },
}));

vi.mock("@wwwuabot/shared/shop", () => ({ validateProductDraft: h.validate }));

vi.mock("../services/shop/products.service", () => ({
  ShopProductsService: class {
    listOwn = h.shop.listOwn;
    save = h.shop.save;
    remove = h.shop.remove;
    catalog = h.shop.catalog;
  },
}));

const { handleUserShopProducts, handlePublicShopProducts } = await import("./shop.controller");

const ENV = {} as Env;
const PRODUCT = { id: 1, title: "Кава" };
const DATA = { products: [PRODUCT], media: [] };

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
  h.validate.mockReturnValue({ ok: true, value: { title: "Кава" } });
  h.shop.listOwn.mockResolvedValue(DATA);
  h.shop.save.mockResolvedValue({ kind: "ok", product: PRODUCT, media: [] });
  h.shop.remove.mockResolvedValue(true);
  h.shop.catalog.mockResolvedValue(DATA);
});

describe("власні товари", () => {
  it("без ідентичності нічого не віддає", async () => {
    h.authorized = false;
    const res = await handleUserShopProducts(request("GET", "/api/user/shop/products?shop=1"), ENV);

    expect(res.status).toBe(401);
    expect(h.shop.listOwn).not.toHaveBeenCalled();
  });

  it("без номера магазину — 400", async () => {
    const res = await handleUserShopProducts(request("GET", "/api/user/shop/products"), ENV);

    expect(res.status).toBe(400);
  });

  it("чужого магазину не видно — 404", async () => {
    h.shop.listOwn.mockResolvedValue(null);
    const res = await handleUserShopProducts(request("GET", "/api/user/shop/products?shop=1"), ENV);

    expect(res.status).toBe(404);
  });

  it("GET віддає товари разом із файлами", async () => {
    const res = await handleUserShopProducts(request("GET", "/api/user/shop/products?shop=3"), ENV);

    expect(await res.json()).toEqual({ ok: true, products: [PRODUCT], media: [] });
    expect(h.shop.listOwn).toHaveBeenCalledWith(3, 777);
  });

  it("POST створює товар", async () => {
    const res = await handleUserShopProducts(
      request("POST", "/api/user/shop/products?shop=3", { title: "Кава" }),
      ENV,
    );

    expect(await res.json()).toEqual({ ok: true, product: PRODUCT, media: [] });
    expect(h.shop.save).toHaveBeenCalledWith(3, 777, { title: "Кава" }, undefined);
  });

  it("POST із номером править саме його", async () => {
    await handleUserShopProducts(request("POST", "/api/user/shop/products?shop=3", { id: 5 }), ENV);

    expect(h.shop.save).toHaveBeenCalledWith(3, 777, { title: "Кава" }, 5);
  });

  it("правка того, чого немає, — 404", async () => {
    h.shop.save.mockResolvedValue({ kind: "not_found" });
    const res = await handleUserShopProducts(
      request("POST", "/api/user/shop/products?shop=3", {}),
      ENV,
    );

    expect(res.status).toBe(404);
  });

  it("зайнята адреса товару — 409", async () => {
    h.shop.save.mockResolvedValue({ kind: "address_taken" });
    const res = await handleUserShopProducts(
      request("POST", "/api/user/shop/products?shop=3", {}),
      ENV,
    );

    expect(res.status).toBe(409);
  });

  it("бите тіло відсікається як 400", async () => {
    const res = await handleUserShopProducts(
      request("POST", "/api/user/shop/products?shop=3", "{"),
      ENV,
    );

    expect(res.status).toBe(400);
    expect(h.shop.save).not.toHaveBeenCalled();
  });

  it("зміст відмови віддає спільне правило", async () => {
    h.validate.mockReturnValue({ ok: false, message: "Немає назви" });
    const res = await handleUserShopProducts(
      request("POST", "/api/user/shop/products?shop=3", {}),
      ENV,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Немає назви" });
  });

  it("DELETE без номера товару — 400", async () => {
    const res = await handleUserShopProducts(
      request("DELETE", "/api/user/shop/products?shop=3"),
      ENV,
    );

    expect(res.status).toBe(400);
    expect(h.shop.remove).not.toHaveBeenCalled();
  });

  it("DELETE того, чого немає, — 404", async () => {
    h.shop.remove.mockResolvedValue(false);
    const res = await handleUserShopProducts(
      request("DELETE", "/api/user/shop/products?shop=3&id=1"),
      ENV,
    );

    expect(res.status).toBe(404);
  });

  it("DELETE прибирає свій товар", async () => {
    const res = await handleUserShopProducts(
      request("DELETE", "/api/user/shop/products?shop=3&id=1"),
      ENV,
    );

    expect(await res.json()).toEqual({ ok: true, id: 1 });
    expect(h.shop.remove).toHaveBeenCalledWith(3, 777, 1);
  });

  it("метод, якого тут немає, — 405", async () => {
    const res = await handleUserShopProducts(request("PUT", "/api/user/shop/products?shop=3"), ENV);

    expect(res.status).toBe(405);
  });

  it("збій сховища — 500", async () => {
    h.shop.listOwn.mockRejectedValue(new Error("D1 down"));
    const res = await handleUserShopProducts(request("GET", "/api/user/shop/products?shop=3"), ENV);

    expect(res.status).toBe(500);
  });
});

describe("каталог відкритого магазину", () => {
  it("без адреси магазину — 400", async () => {
    const res = await handlePublicShopProducts(request("GET", "/api/public/shop/products"), ENV);

    expect(res.status).toBe(400);
  });

  it("закритий чи неіснуючий магазин — 404", async () => {
    h.shop.catalog.mockResolvedValue(null);
    const res = await handlePublicShopProducts(
      request("GET", "/api/public/shop/products?shop=kava"),
      ENV,
    );

    expect(res.status).toBe(404);
  });

  it("віддає каталог за адресою магазину", async () => {
    const res = await handlePublicShopProducts(
      request("GET", "/api/public/shop/products?shop=%20kava%20&limit=10"),
      ENV,
    );

    expect(await res.json()).toEqual({ ok: true, products: [PRODUCT], media: [] });
    expect(h.shop.catalog).toHaveBeenCalledWith("kava", "10");
  });

  it("збій сховища — 500", async () => {
    h.shop.catalog.mockRejectedValue(new Error("D1 down"));
    const res = await handlePublicShopProducts(
      request("GET", "/api/public/shop/products?shop=kava"),
      ENV,
    );

    expect(res.status).toBe(500);
  });
});
