/**
 * Правила замовлення: що питаємо в покупця й що з цього обов'язкове.
 *
 * Головне, що тут фіксується: **набір полів залежить від виду товару** —
 * фізичний питає адресу, цифровий питає канал, — а кошик без позицій не
 * проходить зовсім. Ціна в замовленні не приймається від клієнта: її бере
 * сервіс із товару (знімок), інакше покупець називав би свою.
 *
 * @module @wwwuabot/shared/shop
 */

import { describe, expect, it } from "vitest";
import {
  ORDER_ITEMS_MAX,
  ORDER_QTY_MAX,
  cleanOrderItems,
  orderContactFields,
  sanitizeOrderContact,
  validateOrderDraft,
} from "./orders";

describe("що питаємо в покупця", () => {
  it("фізичний товар питає адресу доставки", () => {
    expect(orderContactFields(true).map((field) => field.key)).toEqual([
      "name",
      "phone",
      "address",
    ]);
  });

  it("цифровий товар адреси не питає: його віддають, а не надсилають", () => {
    expect(orderContactFields(false).map((field) => field.key)).toEqual([
      "name",
      "phone",
      "channel",
    ]);
  });
});

describe("контакт покупця", () => {
  it("лишає тільки ті поля, які ми справді питаємо", () => {
    const contact = sanitizeOrderContact(
      {
        name: " Олена ",
        phone: "+380 67 000 00 00",
        address: "Київ, Верхній Вал 10",
        знижка: "50%",
      },
      true,
    );

    expect(contact).toEqual({
      ok: true,
      value: { name: "Олена", phone: "+380 67 000 00 00", address: "Київ, Верхній Вал 10" },
    });
  });

  it("⛔ без обов'язкового поля замовлення не приймається", () => {
    const contact = sanitizeOrderContact({ name: "Олена", phone: "" }, true);
    expect(contact).toEqual({ ok: false, message: "«Телефон» — обов'язкове поле" });
  });

  it("⛔ адреса цифровому товару не потрібна — і не вимагається", () => {
    const contact = sanitizeOrderContact({ name: "Олена", phone: "067", channel: "@olena" }, false);
    expect(contact.ok && contact.value).toEqual({ name: "Олена", phone: "067", channel: "@olena" });
  });
});

describe("кошик", () => {
  it("повтор товару складається: двічі «додати» — це два, а не один", () => {
    expect(
      cleanOrderItems([
        { productId: 5, qty: 1 },
        { productId: 5, qty: 2 },
        { productId: 9, qty: 1 },
      ]),
    ).toEqual([
      { productId: 5, qty: 3 },
      { productId: 9, qty: 1 },
    ]);
  });

  it("кількість і перелік мають стелі", () => {
    expect(cleanOrderItems([{ productId: 5, qty: 500 }])).toEqual([
      { productId: 5, qty: ORDER_QTY_MAX },
    ]);
    const many = Array.from({ length: ORDER_ITEMS_MAX + 5 }, (_, i) => ({
      productId: i + 1,
      qty: 1,
    }));
    expect(cleanOrderItems(many)).toHaveLength(ORDER_ITEMS_MAX);
  });

  it("позиція без номера товару відкидається", () => {
    expect(cleanOrderItems([{ productId: 0, qty: 1 }, { qty: 1 }, "сміття"])).toEqual([]);
  });
});

describe("чернетка замовлення", () => {
  it("⛔ порожній кошик не проходить із нулем", () => {
    expect(validateOrderDraft({ items: [] }, true)).toEqual({
      ok: false,
      message: "Кошик порожній — оберіть товар",
    });
  });

  it("проходить із позиціями й контактом, а нотатка обрізається краями", () => {
    const result = validateOrderDraft(
      {
        items: [{ productId: 3, qty: 2 }],
        contact: { name: "Олена", phone: "067", address: "Київ" },
        note: "  передзвоніть після 18:00  ",
      },
      true,
    );

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toEqual({
      items: [{ productId: 3, qty: 2 }],
      contact: { name: "Олена", phone: "067", address: "Київ" },
      note: "передзвоніть після 18:00",
    });
  });
});
