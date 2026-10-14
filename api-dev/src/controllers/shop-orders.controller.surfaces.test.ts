/**
 * Контролер замовлень магазину — **поверхні й коди відповідей**.
 *
 * Дві речі перевіряються тут навмисно. Перша: `GET`/`DELETE` на адресу статусу —
 * `405`, бо адреса, яка обіцяє дію, не мусить віддавати список. Друга: право на
 * номер магазину перевіряє сервіс, тож «немає» й «чуже» тут нерозрізненні (`404`).
 *
 * @module api-dev/src/controllers/shop-orders.controller.surfaces.test
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const h = vi.hoisted(() => ({
  authorized: true,
  orders: {
    listOwn: vi.fn(),
    statuses: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    place: vi.fn(),
  },
}));

vi.mock("../shared/identity", () => ({
  resolveUserId: async () =>
    h.authorized
      ? { ok: true as const, userId: 777 }
      : { ok: false as const, response: new Response(null, { status: 401 }) },
}));

vi.mock("../services/shop/orders.service", () => ({
  ShopOrdersService: class {
    listOwn = h.orders.listOwn;
    statuses = h.orders.statuses;
    update = h.orders.update;
    remove = h.orders.remove;
    place = h.orders.place;
  },
}));

const { handleUserShopOrders, handleUserShopStatuses, handlePublicShopOrders } =
  await import("./shop-orders.controller");

const ENV = {} as Env;
const ORDER = { id: 2, status: "new" };

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
  h.orders.listOwn.mockResolvedValue([ORDER]);
  h.orders.statuses.mockResolvedValue([{ key: "new", label: "Нове" }]);
  h.orders.update.mockResolvedValue({ kind: "ok", order: ORDER });
  h.orders.remove.mockResolvedValue({ kind: "ok" });
  h.orders.place.mockResolvedValue({ kind: "ok", order: ORDER });
});

describe("черга замовлень", () => {
  it("без ідентичності нічого не віддає", async () => {
    h.authorized = false;
    const res = await handleUserShopOrders(request("GET", "/api/user/shop/orders?shop=1"), ENV);

    expect(res.status).toBe(401);
    expect(h.orders.listOwn).not.toHaveBeenCalled();
  });

  it("GET на адресу статусу — 405, а не список", async () => {
    const res = await handleUserShopOrders(request("GET", "/api/user/shop/orders/status"), ENV);

    expect(res.status).toBe(405);
    expect(h.orders.listOwn).not.toHaveBeenCalled();
  });

  it("GET без номера магазину — 400", async () => {
    const res = await handleUserShopOrders(request("GET", "/api/user/shop/orders"), ENV);

    expect(res.status).toBe(400);
  });

  it("чужого магазину не видно: сервіс віддає «нічого» — 404", async () => {
    h.orders.listOwn.mockResolvedValue(null);
    const res = await handleUserShopOrders(request("GET", "/api/user/shop/orders?shop=1"), ENV);

    expect(res.status).toBe(404);
  });

  it("GET віддає замовлення свого магазину", async () => {
    const res = await handleUserShopOrders(request("GET", "/api/user/shop/orders?shop=3"), ENV);

    expect(await res.json()).toEqual({ ok: true, orders: [ORDER] });
    expect(h.orders.listOwn).toHaveBeenCalledWith(3, 777);
  });

  it("POST без номера замовлення — 400", async () => {
    const res = await handleUserShopOrders(
      request("POST", "/api/user/shop/orders", { shop: 1 }),
      ENV,
    );

    expect(res.status).toBe(400);
    expect(h.orders.update).not.toHaveBeenCalled();
  });

  it("POST править замовлення свого магазину", async () => {
    const res = await handleUserShopOrders(
      request("POST", "/api/user/shop/orders", { shop: 3, id: 2, status: "done" }),
      ENV,
    );

    expect(await res.json()).toEqual({ ok: true, order: ORDER });
    expect(h.orders.update).toHaveBeenCalledWith(3, 777, 2, { shop: 3, id: 2, status: "done" });
  });

  it("правка того, чого немає, — 404", async () => {
    h.orders.update.mockResolvedValue({ kind: "not_found" });
    const res = await handleUserShopOrders(
      request("POST", "/api/user/shop/orders", { shop: 3, id: 2 }),
      ENV,
    );

    expect(res.status).toBe(404);
  });

  it("відхилену правку сервіс називає причиною — 400", async () => {
    h.orders.update.mockResolvedValue({ kind: "rejected", message: "Немає позицій" });
    const res = await handleUserShopOrders(
      request("POST", "/api/user/shop/orders", { shop: 3, id: 2 }),
      ENV,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Немає позицій" });
  });

  it("DELETE на адресу статусу — 405", async () => {
    const res = await handleUserShopOrders(request("DELETE", "/api/user/shop/orders/status"), ENV);

    expect(res.status).toBe(405);
    expect(h.orders.remove).not.toHaveBeenCalled();
  });

  it("DELETE без номера — 400", async () => {
    const res = await handleUserShopOrders(request("DELETE", "/api/user/shop/orders?shop=3"), ENV);

    expect(res.status).toBe(400);
  });

  it("DELETE прибирає замовлення зі своєї черги", async () => {
    const res = await handleUserShopOrders(
      request("DELETE", "/api/user/shop/orders?shop=3&id=2"),
      ENV,
    );

    expect(await res.json()).toEqual({ ok: true, id: 2 });
    expect(h.orders.remove).toHaveBeenCalledWith(3, 777, 2);
  });

  it("DELETE того, чого немає, — 404", async () => {
    h.orders.remove.mockResolvedValue({ kind: "not_found" });
    const res = await handleUserShopOrders(
      request("DELETE", "/api/user/shop/orders?shop=3&id=2"),
      ENV,
    );

    expect(res.status).toBe(404);
  });

  it("метод, якого тут немає, — 405", async () => {
    const res = await handleUserShopOrders(request("PUT", "/api/user/shop/orders"), ENV);

    expect(res.status).toBe(405);
  });

  it("збій сховища — 500 без подробиць", async () => {
    h.orders.listOwn.mockRejectedValue(new Error("D1 down"));
    const res = await handleUserShopOrders(request("GET", "/api/user/shop/orders?shop=1"), ENV);

    expect(res.status).toBe(500);
  });
});

describe("статуси магазину", () => {
  it("без номера магазину — 400", async () => {
    const res = await handleUserShopStatuses(request("GET", "/api/user/shop/statuses"), ENV);

    expect(res.status).toBe(400);
  });

  it("чужого магазину не видно — 404", async () => {
    h.orders.statuses.mockResolvedValue(null);
    const res = await handleUserShopStatuses(request("GET", "/api/user/shop/statuses?shop=3"), ENV);

    expect(res.status).toBe(404);
  });

  it("віддає типові статуси з правками магазину", async () => {
    const res = await handleUserShopStatuses(request("GET", "/api/user/shop/statuses?shop=3"), ENV);

    expect(await res.json()).toEqual({ ok: true, statuses: [{ key: "new", label: "Нове" }] });
    expect(h.orders.statuses).toHaveBeenCalledWith(3, 777);
  });

  it("збій сховища — 500", async () => {
    h.orders.statuses.mockRejectedValue(new Error("D1 down"));
    const res = await handleUserShopStatuses(request("GET", "/api/user/shop/statuses?shop=3"), ENV);

    expect(res.status).toBe(500);
  });
});

describe("замовити у відкритому магазині", () => {
  it("покупець обов'язковий: без ідентичності замовлення не приймається", async () => {
    h.authorized = false;
    const res = await handlePublicShopOrders(
      request("POST", "/api/public/shop/orders?shop=kava"),
      ENV,
    );

    expect(res.status).toBe(401);
    expect(h.orders.place).not.toHaveBeenCalled();
  });

  it("без адреси магазину — 400", async () => {
    const res = await handlePublicShopOrders(request("POST", "/api/public/shop/orders"), ENV);

    expect(res.status).toBe(400);
  });

  it("закритий чи неіснуючий магазин — 404", async () => {
    h.orders.place.mockResolvedValue({ kind: "not_found" });
    const res = await handlePublicShopOrders(
      request("POST", "/api/public/shop/orders?shop=kava", {}),
      ENV,
    );

    expect(res.status).toBe(404);
  });

  it("відхилене замовлення називає причину — 400", async () => {
    h.orders.place.mockResolvedValue({ kind: "rejected", message: "Кошик порожній" });
    const res = await handlePublicShopOrders(
      request("POST", "/api/public/shop/orders?shop=kava", {}),
      ENV,
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "Кошик порожній" });
  });

  it("прийняте замовлення віддається покупцю", async () => {
    const res = await handlePublicShopOrders(
      request("POST", "/api/public/shop/orders?shop=%20kava%20", { items: [] }),
      ENV,
    );

    expect(await res.json()).toEqual({ ok: true, order: ORDER });
    expect(h.orders.place).toHaveBeenCalledWith("kava", 777, { items: [] });
  });

  it("збій сховища — 500", async () => {
    h.orders.place.mockRejectedValue(new Error("D1 down"));
    const res = await handlePublicShopOrders(
      request("POST", "/api/public/shop/orders?shop=kava", {}),
      ENV,
    );

    expect(res.status).toBe(500);
  });
});
