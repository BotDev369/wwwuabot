/**
 * Замовлення на екрані: статус словом магазину, позиції знімком і контакт.
 *
 * Головне, що тут фіксується: показ читає **ключ** статусу й перекладає його
 * підписом магазину, а підписи контакту беруться з **видів позицій цього
 * замовлення** — тобто форма й картка не можуть розійтися словами
 * (`docs/SHOPS.md` §6–7).
 *
 * @module web-platform-dev/src/pages/shop
 */

import { describe, expect, it } from "vitest";
import { resolveOrderStatuses, type ShopOrder } from "@wwwuabot/shared/shop";
import { orderContactLines, orderHint, orderItemsLine, shopOrdersHint } from "./order-view";

function order(over: Partial<ShopOrder> = {}): ShopOrder {
  return {
    id: 12,
    shopId: 3,
    buyerId: 42,
    status: "new",
    contact: { name: "Олена", phone: "067", channel: "@olena" },
    note: "",
    items: [{ productId: 5, title: "Рецепти", price: "150 ₴", kind: "digital", qty: 2 }],
    createdAt: "2026-09-25 10:00:00",
    updatedAt: "2026-09-25 10:00:00",
    ...over,
  };
}

describe("рядок замовлення", () => {
  it("статус показується словом магазину, а не ключем", () => {
    const statuses = resolveOrderStatuses([{ key: "new", label: "Прийнято" }]);
    expect(orderHint(order(), statuses)).toContain("Прийнято");
    expect(orderHint(order(), statuses)).not.toContain("new");
  });

  it("ключ, якого в магазині вже немає, показується як є — історія не зникає", () => {
    const statuses = resolveOrderStatuses([{ key: "packed", label: "Паковано" }]);
    expect(orderHint(order({ status: "packed" }), statuses)).toContain("Паковано");
    expect(orderHint(order({ status: "архів" }), statuses)).toContain("архів");
  });

  it("позиції йдуть знімком замовлення, а не товаром", () => {
    const items = [
      { productId: 5, title: "Рецепти", price: "150 ₴", kind: "digital", qty: 2 },
      { productId: 6, title: "Чашка", price: "480 ₴", kind: "physical", qty: 1 },
    ];
    expect(orderItemsLine(order({ items }))).toBe("Рецепти × 2, Чашка × 1");
  });
});

describe("контакт покупця", () => {
  it("цифровому замовленню підписує канал, а не адресу", () => {
    expect(orderContactLines(order())).toEqual([
      { label: "Ім'я", value: "Олена" },
      { label: "Телефон", value: "067" },
      { label: "Куди надіслати (нік або пошта)", value: "@olena" },
    ]);
  });

  it("фізичному замовленню підписує адресу доставки", () => {
    const lines = orderContactLines(
      order({
        items: [{ productId: 6, title: "Чашка", price: "480 ₴", kind: "physical", qty: 1 }],
        contact: { name: "Олена", phone: "067", address: "Київ" },
      }),
    );

    expect(lines.map((line) => line.label)).toContain("Адреса доставки");
  });

  it("порожні поля не показуються порожніми рядками", () => {
    const lines = orderContactLines(order({ contact: { name: "Олена", phone: "  " } }));
    expect(lines).toEqual([{ label: "Ім'я", value: "Олена" }]);
  });

  it("невідоме поле показується своїм ключем, а не мовчки зникає", () => {
    const lines = orderContactLines(order({ contact: { name: "Олена", знижка: "50%" } }));
    expect(lines).toContainEqual({ label: "знижка", value: "50%" });
  });
});

describe("підпис під списком", () => {
  it("порожній список — це стан, а не порожнє місце", () => {
    expect(shopOrdersHint(false, 0)).toContain("Замовлень ще немає");
    expect(shopOrdersHint(false, 3)).toBe("Замовлень: 3");
    expect(shopOrdersHint(true, 0)).toContain("Завантаження");
  });
});
