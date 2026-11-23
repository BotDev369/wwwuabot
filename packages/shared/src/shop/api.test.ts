/**
 * Клієнт магазину — сторож **форми запиту**.
 *
 * Це рівно те місце, де помилка не видно ні компілятору, ні оку: сервер читає
 * номер магазину з **адреси** (`shop.controller.ts`), а тіло — це сама
 * чернетка. Зайвий номер у тілі й відсутній в адресі дали б
 * `Missing shop` — тобто «товар не зберігається» без жодної підказки, що́ саме
 * не так. Тому перевіряється і адреса, і тіло.
 *
 * @module @wwwuabot/shared/shop
 */

import { describe, expect, it } from "vitest";
import { createShopApi, type ShopApiPaths } from "./api";

const PATHS: ShopApiPaths = {
  products: "/api/user/shop/products",
  media: "/api/user/shop/media",
  catalog: "/api/public/shop/products",
  shops: "/api/public/shops",
  orders: "/api/user/shop/orders",
  orderStatus: "/api/user/shop/orders/status",
  placeOrder: "/api/public/shop/orders",
  quickOrder: "/api/public/shop/orders/quick",
  statuses: "/api/user/shop/statuses",
  cart: "/api/user/shop/cart",
};

interface Call {
  path: string;
  init?: RequestInit;
}

/** Клієнт із записаними викликами: транспорт замінюється, правила — ні. */
function api(response: unknown = { ok: true }) {
  const calls: Call[] = [];
  const forms: Call[] = [];

  const client = createShopApi(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      calls.push({ path, init });
      return response as T;
    },
    async <T>(path: string, form: FormData): Promise<T> => {
      forms.push({ path, init: { body: form } });
      return response as T;
    },
    PATHS,
  );

  return { client, calls, forms };
}

/** Тіло запиту, розібране як JSON, — щоб бачити саме те, що поїде на сервер. */
function bodyOf(call: Call): Record<string, unknown> {
  return JSON.parse(String(call.init?.body ?? "{}")) as Record<string, unknown>;
}

describe("збереження товару", () => {
  const draft = {
    kind: "physical" as const,
    title: "Кава",
    category: "Кава",
    summary: "",
    description: "",
    price: "320 ₴",
    address: "kava",
    images: [],
    attributes: [],
    isActive: true,
  };

  it("номер магазину їде в адресі, а не в тілі", () => {
    const { client, calls } = api({ ok: true, product: null });

    void client.saveProduct(7, draft);

    expect(calls[0].path).toBe("/api/user/shop/products?shop=7");
    expect(calls[0].init?.method).toBe("POST");
    expect(bodyOf(calls[0])).toEqual(draft);
  });

  it("правка несе номер товару — інакше це був би новий товар", () => {
    const { client, calls } = api({ ok: true, product: null });

    void client.saveProduct(7, { ...draft, id: 42 });

    expect(bodyOf(calls[0]).id).toBe(42);
  });

  it("порожня відповідь — не товар: «нічого» лишається «нічим»", async () => {
    const { client } = api({ ok: true, product: null });

    await expect(client.saveProduct(7, draft)).resolves.toBeNull();
  });
});

describe("номер магазину — завжди в адресі", () => {
  it("свої товари, файли й замовлення питаються тим самим ключем", async () => {
    const { client, calls } = api({ ok: true, products: [], media: [], orders: [], statuses: [] });

    await client.products(7);
    await client.media(7);
    await client.orders(7);
    await client.statuses(7);

    expect(calls.map((call) => call.path)).toEqual([
      "/api/user/shop/products?shop=7",
      "/api/user/shop/media?shop=7",
      "/api/user/shop/orders?shop=7",
      "/api/user/shop/statuses?shop=7",
    ]);
  });

  it("каталог питається **адресою** магазину: покупцеві номер не казали", async () => {
    const { client, calls } = api({ ok: true, products: [], media: [] });

    await client.catalog("kava");

    expect(calls[0].path).toBe("/api/public/shop/products?shop=kava");
  });

  it("замовити можна лише за адресою — і позиції без ціни", async () => {
    const { client, calls } = api({ ok: true, order: { id: 3 } });

    await client.placeOrder("kava", {
      items: [{ productId: 1, qty: 2 }],
      contact: { name: "Ім'я", phone: "+380" },
      note: "",
    });

    expect(calls[0].path).toBe("/api/public/shop/orders?shop=kava");
    expect(bodyOf(calls[0])).toEqual({
      items: [{ productId: 1, qty: 2 }],
      contact: { name: "Ім'я", phone: "+380" },
      note: "",
    });
  });

  it("швидке замовлення несе лише позиції: контакт бере сервер", async () => {
    const { client, calls } = api({ ok: true, order: { id: 4 } });

    await client.quickOrder("kava", [{ productId: 2, qty: 1 }]);

    expect(calls[0].path).toBe("/api/public/shop/orders/quick?shop=kava");
    expect(bodyOf(calls[0])).toEqual({ items: [{ productId: 2, qty: 1 }] });
  });

  it("файл їде формою, і номер магазину в ній — не в адресі", async () => {
    const { client, forms } = api({ ok: true, media: { id: 1 } });

    await client.upload(7, new File(["x"], "kava.jpg"));

    expect(forms[0].path).toBe("/api/user/shop/media");
    expect((forms[0].init?.body as FormData).get("shop")).toBe("7");
  });
});

describe("зміна статусу — єдиний шлях, де номер магазину в тілі", () => {
  it("тіло несе магазин, замовлення й ключ статусу", async () => {
    const { client, calls } = api({ ok: true });

    await client.setOrderStatus(7, 42, "done");

    expect(calls[0].path).toBe("/api/user/shop/orders/status");
    expect(bodyOf(calls[0])).toEqual({ shop: 7, id: 42, status: "done" });
  });
});

describe("список магазинів — без параметрів", () => {
  it("питає рівно свій шлях: відбір робить сервер, а не клієнт", async () => {
    const { client, calls } = api({ ok: true, shops: [] });
    await client.shops();

    expect(calls).toHaveLength(1);
    expect(calls[0]?.path).toBe(PATHS.shops);
  });

  it("порожня відповідь — порожній список, а не помилка", async () => {
    const { client } = api({ ok: true });

    expect(await client.shops()).toEqual([]);
  });
});

describe("кошик — один шлях на всі дії", () => {
  it("читання й очищення питають адресу магазину, без тіла", async () => {
    const { client, calls } = api({ ok: true, lines: [{ productId: 4, qty: 2 }] });

    expect(await client.cart("kava")).toEqual([{ productId: 4, qty: 2 }]);
    await client.clearCart("kava");

    expect(calls[0].path).toBe("/api/user/shop/cart?shop=kava");
    expect(calls[0].init?.body).toBeUndefined();
    expect(calls[1].init?.method).toBe("DELETE");
  });

  it("додати — дельта, поставити — абсолютна кількість", async () => {
    const { client, calls } = api({ ok: true, lines: [] });

    await client.addCartLine("kava", 4, 2);
    await client.setCartLine("kava", 4, 5);

    expect(bodyOf(calls[0])).toEqual({ productId: 4, delta: 2 });
    expect(bodyOf(calls[1])).toEqual({ productId: 4, qty: 5 });
    expect(calls[0].init?.method).toBe("PUT");
  });

  it("прибрати позицію — номер товару в адресі", async () => {
    const { client, calls } = api({ ok: true, lines: [] });

    await client.removeCartLine("kava", 4);

    expect(calls[0].path).toBe("/api/user/shop/cart?shop=kava&productId=4");
    expect(calls[0].init?.method).toBe("DELETE");
  });

  it("відмова сервера — помилка з текстом, а не порожній кошик", async () => {
    const { client } = api({ ok: false, error: "Товару більше немає" });

    await expect(client.addCartLine("kava", 4)).rejects.toThrow("Товару більше немає");
  });
});

describe("відмова приходить словом, а не мовчанням", () => {
  it("прибрати товар не вдалось — це помилка з текстом сервера", async () => {
    const { client } = api({ ok: false, error: "Не знайдено" });

    await expect(client.removeProduct(7, 42)).rejects.toThrow("Не знайдено");
  });

  it("замовлення не прийняли — це помилка з текстом сервера", async () => {
    const { client } = api({ ok: false, error: "Кошик порожній" });

    await expect(client.placeOrder("kava", { items: [], contact: {}, note: "" })).rejects.toThrow(
      "Кошик порожній",
    );
  });
});
