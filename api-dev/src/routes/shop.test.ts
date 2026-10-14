/**
 * Шляхи магазину: **кожна адреса веде саме туди, і чужа лишається чужою**.
 *
 * Роутер — це список адрес; помилка тут тихо віддає чужий шлях сусідньому
 * модулю або мовчки не віддає нічого. Тому перевіряється і власна (з
 * ідентичністю з `initData`), і публічна група, і те, що не-магазинний шлях
 * лишається **не нашим** (`null`), щоб роутер пішов далі.
 *
 * @module api-dev/src/routes/shop.test
 */

import { describe, expect, it, vi } from "vitest";
import type { Env } from "../shared/types";

const handlers = {
  handleUserShopProducts: vi.fn(),
  handlePublicShopProducts: vi.fn(),
  handleUserShopMedia: vi.fn(),
  handleShopMediaFile: vi.fn(),
  handleUserShopOrders: vi.fn(),
  handleUserShopStatuses: vi.fn(),
  handlePublicShopOrders: vi.fn(),
};

vi.mock("../controllers/shop.controller", () => ({
  handleUserShopProducts: handlers.handleUserShopProducts,
  handlePublicShopProducts: handlers.handlePublicShopProducts,
}));
vi.mock("../controllers/shop-media.controller", () => ({
  handleUserShopMedia: handlers.handleUserShopMedia,
  handleShopMediaFile: handlers.handleShopMediaFile,
}));
vi.mock("../controllers/shop-orders.controller", () => ({
  handleUserShopOrders: handlers.handleUserShopOrders,
  handleUserShopStatuses: handlers.handleUserShopStatuses,
  handlePublicShopOrders: handlers.handlePublicShopOrders,
}));

const { matchShopRoute } = await import("./shop");

const ENV = {} as Env;
const request = (method = "GET", path = "/api/user/shop/products"): Request =>
  new Request(`https://api.test${path}`, { method });

/** Контролери відповідають міткою — важлива лише адреса, за якою їх покликали. */
function answersWithMarker(marker: string): void {
  for (const handler of Object.values(handlers)) handler.mockReturnValue(new Response(marker));
}

describe("власні шляхи", () => {
  it("товари й медіа ведуть у свої контролери", async () => {
    answersWithMarker("own");
    const req = request("POST", "/api/user/shop/products");

    expect(await (matchShopRoute(req, ENV, "/api/user/shop/products") as Response).text()).toBe(
      "own",
    );
    expect(handlers.handleUserShopProducts).toHaveBeenCalledWith(req, ENV);

    await matchShopRoute(request("POST", "/api/user/shop/media"), ENV, "/api/user/shop/media");
    expect(handlers.handleUserShopMedia).toHaveBeenCalled();
  });

  it("замовлення й адреса статусу ведуть в один контролер", async () => {
    answersWithMarker("orders");

    await matchShopRoute(request("GET", "/api/user/shop/orders"), ENV, "/api/user/shop/orders");
    await matchShopRoute(
      request("POST", "/api/user/shop/orders/status"),
      ENV,
      "/api/user/shop/orders/status",
    );

    expect(handlers.handleUserShopOrders).toHaveBeenCalledTimes(2);
  });

  it("статуси — лише GET; інший метод лишається сусідньому модулю", async () => {
    answersWithMarker("statuses");

    await matchShopRoute(request("GET", "/api/user/shop/statuses"), ENV, "/api/user/shop/statuses");
    expect(handlers.handleUserShopStatuses).toHaveBeenCalled();

    expect(
      matchShopRoute(request("POST", "/api/user/shop/statuses"), ENV, "/api/user/shop/statuses"),
    ).toBeNull();
  });
});

describe("публічні шляхи", () => {
  it("файл магазину приходить розкодованим: слеші всередині ключа зберігаються", async () => {
    answersWithMarker("file");
    await matchShopRoute(
      request("GET", "/api/shop/media/shop/1/pic%2Fa.png"),
      ENV,
      "/api/shop/media/shop/1/pic%2Fa.png",
    );

    expect(handlers.handleShopMediaFile).toHaveBeenCalledWith(ENV, "shop/1/pic/a.png");
  });

  it("битий ключ не йде в сховище, а відсікається як 400", async () => {
    const response = await matchShopRoute(
      request("GET", "/api/shop/media/%E0%A4%A"),
      ENV,
      "/api/shop/media/%E0%A4%A",
    );

    expect((response as Response).status).toBe(400);
    expect(handlers.handleShopMediaFile).not.toHaveBeenCalled();
  });

  it("каталог магазину — лише GET", async () => {
    answersWithMarker("catalog");

    await matchShopRoute(
      request("GET", "/api/public/shop/products"),
      ENV,
      "/api/public/shop/products",
    );
    expect(handlers.handlePublicShopProducts).toHaveBeenCalled();

    expect(
      matchShopRoute(
        request("POST", "/api/public/shop/products"),
        ENV,
        "/api/public/shop/products",
      ),
    ).toBeNull();
  });

  it("замовлення приймають лише POST", async () => {
    answersWithMarker("place");
    const req = request("POST", "/api/public/shop/orders");

    await matchShopRoute(req, ENV, "/api/public/shop/orders");
    expect(handlers.handlePublicShopOrders).toHaveBeenCalledWith(req, ENV);

    expect(
      matchShopRoute(request("GET", "/api/public/shop/orders"), ENV, "/api/public/shop/orders"),
    ).toBeNull();
  });
});

describe("чужий шлях", () => {
  it("не-магазинна адреса лишається сусідньому модулю", () => {
    answersWithMarker("marker");

    expect(matchShopRoute(request("GET", "/api/notes"), ENV, "/api/notes")).toBeNull();
  });
});
