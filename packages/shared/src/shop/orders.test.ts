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
  ORDER_NOTICE_MAX,
  ORDER_QTY_MAX,
  ORDER_SELLER_NOTE_MAX,
  cleanOrderItems,
  mergeOrderItems,
  orderContactFields,
  orderNeedsShipping,
  orderNoticeText,
  sanitizeOrderContact,
  sanitizeSellerNote,
  validateOrderDraft,
} from "./orders";
import type { OrderItem } from "./types";
import type { ShopOrder } from "./types";

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

describe("доставка за кошиком", () => {
  it("змішане замовлення питає адресу — фізичній частині її нікуди подіти", () => {
    expect(orderNeedsShipping(["digital", "physical"])).toBe(true);
  });

  it("без фізичного товару доставки немає", () => {
    expect(orderNeedsShipping(["digital", "service"])).toBe(false);
  });

  it("невідомий вид доставки не просить — те саме правило, що в картці товару", () => {
    expect(orderNeedsShipping(["невідоме"])).toBe(false);
    expect(orderNeedsShipping([])).toBe(false);
  });
});

describe("позначка платформи в розмові", () => {
  const order: ShopOrder = {
    id: 12,
    shopId: 3,
    buyerId: 42,
    status: "new",
    contact: { name: "Олена", phone: "067", address: "Київ" },
    note: "передзвоніть",
    sellerNote: "",
    items: [
      { productId: 5, title: "Еспресо-суміш", price: "320 ₴", kind: "physical", qty: 2 },
      { productId: 6, title: "Рецепти", price: "150 ₴", kind: "digital", qty: 1 },
    ],
    createdAt: "2026-09-25T00:00:00.000Z",
    updatedAt: "2026-09-25T00:00:00.000Z",
  };

  it("називає замовлення, позиції з кількістю, контакт і примітку", () => {
    const text = orderNoticeText(order, "Кава на розі");

    expect(text).toContain("№12");
    expect(text).toContain("Кава на розі");
    expect(text).toContain("Еспресо-суміш × 2");
    expect(text).toContain("Олена · 067 · Київ");
    expect(text).toContain("передзвоніть");
  });

  it("без підпису магазину не лишає порожнього місця", () => {
    expect(orderNoticeText(order, "   ")).toContain("магазин");
  });

  it("довге замовлення обрізається межею, а не лягає шматком у переписку", () => {
    const long: ShopOrder = {
      ...order,
      items: Array.from({ length: ORDER_ITEMS_MAX }, (_, i) => ({
        productId: i + 1,
        title: "Дуже довга назва товару, яку ніхто не читатиме повністю",
        price: "1 ₴",
        kind: "physical",
        qty: 1,
      })),
    };

    const text = orderNoticeText(long, "Кава на розі");
    expect(text.length).toBeLessThanOrEqual(ORDER_NOTICE_MAX);
    expect(text.endsWith("…")).toBe(true);
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

describe("коментар продавця", () => {
  it("краї притиснуті, а непотрібний текст відрізається межею", () => {
    expect(sanitizeSellerNote("  оплата на картку  ")).toBe("оплата на картку");
    expect(sanitizeSellerNote("я".repeat(ORDER_SELLER_NOTE_MAX + 50))).toHaveLength(
      ORDER_SELLER_NOTE_MAX,
    );
  });

  it("порожній коментар — законне «прибрати свій коментар», а не помилка", () => {
    expect(sanitizeSellerNote("   ")).toBe("");
    expect(sanitizeSellerNote(undefined)).toBe("");
  });
});

describe("правка позицій продавцем", () => {
  const placed: OrderItem[] = [
    { productId: 5, title: "Рецепти", price: "150 ₴", kind: "digital", qty: 2 },
    { productId: 6, title: "Чашка", price: "480 ₴", kind: "physical", qty: 1 },
  ];

  it("кількість міняється, а знімок лишається тим, що був на момент покупки", () => {
    const merged = mergeOrderItems(placed, [{ productId: 5, qty: 7 }]);

    expect(merged).toEqual([{ ...placed[0], qty: 7 }]);
    expect(merged[0].price).toBe("150 ₴");
  });

  it("кого в списку немає, того в замовленні більше немає", () => {
    expect(
      mergeOrderItems(placed, [{ productId: 6, qty: 1 }]).map((item) => item.productId),
    ).toEqual([6]);
  });

  it("нова позиція додається тим знімком, який дав сервер, а не клієнт", () => {
    const merged = mergeOrderItems(
      placed,
      [{ productId: 5, qty: 2 }],
      [{ productId: 9, title: "Кава", price: "320 ₴", kind: "physical", qty: 1 }],
    );

    expect(merged[merged.length - 1]).toEqual({
      productId: 9,
      title: "Кава",
      price: "320 ₴",
      kind: "physical",
      qty: 1,
    });
  });

  it("той самий товар двічі — це кількість, а не другий рядок (те саме, що в кошику)", () => {
    const merged = mergeOrderItems(
      placed,
      [{ productId: 5, qty: 2 }],
      [{ productId: 5, title: "Рецепти", price: "150 ₴", kind: "digital", qty: 3 }],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0].qty).toBe(5);
  });

  it("межа кількості та сама, що в кошика покупця", () => {
    const merged = mergeOrderItems(
      placed,
      [{ productId: 5, qty: ORDER_QTY_MAX }],
      [{ productId: 5, title: "Рецепти", price: "150 ₴", kind: "digital", qty: 5 }],
    );

    expect(merged[0].qty).toBe(ORDER_QTY_MAX);
  });

  it("порожній результат — це нуль позицій, за яким стоїть відмова сервісу", () => {
    expect(mergeOrderItems(placed, [])).toEqual([]);
  });

  it("рядок без номера товару лишається: адресувати його нічим", () => {
    const legacy: OrderItem[] = [
      { productId: null, title: "Стара позиція", price: "", kind: "", qty: 1 },
    ];
    expect(mergeOrderItems(legacy, []).map((item) => item.title)).toEqual(["Стара позиція"]);
  });
});
