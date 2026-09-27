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
import { resolveOrderStatuses, type ShopOrder, type ShopProduct } from "@wwwuabot/shared/shop";
import {
  addableProducts,
  filterOrders,
  orderContactLines,
  orderFilterLabel,
  orderFilterOptions,
  orderHint,
  orderItemsLine,
  orderSortLabel,
  orderStatusTone,
  shopOrdersHint,
  sortOrders,
} from "./order-view";

/** Статуси магазину без правок: типовий потік — та база, від якої все рахується. */
const STATUSES = resolveOrderStatuses();

function order(over: Partial<ShopOrder> = {}): ShopOrder {
  return {
    id: 12,
    shopId: 3,
    buyerId: 42,
    status: "new",
    contact: { name: "Олена", phone: "067", channel: "@olena" },
    note: "",
    sellerNote: "",
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
    expect(shopOrdersHint(false, 0, 0)).toContain("Замовлень ще немає");
    expect(shopOrdersHint(false, 3, 3)).toBe("Замовлень: 3");
    expect(shopOrdersHint(true, 0, 0)).toContain("Завантаження");
  });

  it("під відбором підпис каже і скільки показано, і скільки всього", () => {
    expect(shopOrdersHint(false, 2, 7)).toBe("Знайдено: 2 із 7");
  });
});

describe("колір картки за статусом", () => {
  it("типові статуси мають свій тон", () => {
    expect(orderStatusTone("new", STATUSES)).toBe("new");
    expect(orderStatusTone("confirmed", STATUSES)).toBe("work");
    expect(orderStatusTone("sent", STATUSES)).toBe("work");
    expect(orderStatusTone("done", STATUSES)).toBe("done");
    expect(orderStatusTone("cancelled", STATUSES)).toBe("cancelled");
  });

  it("перейменований статус лишає тон ключа: колір належить роботі, а не слову", () => {
    const renamed = resolveOrderStatuses([{ key: "new", label: "Прийнято" }]);
    expect(orderStatusTone("new", renamed)).toBe("new");
  });

  it("власний статус бере тон зі стадії, а не зі слова", () => {
    const custom = resolveOrderStatuses([
      { key: "packing", label: "Паковано", stage: "open" },
      { key: "refused", label: "Відхилено", stage: "closed" },
    ]);
    expect(orderStatusTone("packing", custom)).toBe("work");
    expect(orderStatusTone("refused", custom)).toBe("done");
  });

  it("ключ, якого в магазині вже немає, фарбується як робота, а не зникає", () => {
    expect(orderStatusTone("archive", STATUSES)).toBe("work");
  });
});

describe("відбір за статусом", () => {
  const orders = [
    order({ id: 3, status: "new" }),
    order({ id: 2, status: "done" }),
    order({ id: 1, status: "archive" }),
  ];

  it("«усі» не відкидають нічого, а статус — усе інше", () => {
    expect(filterOrders(orders, null)).toHaveLength(3);
    expect(filterOrders(orders, "done").map((item) => item.id)).toEqual([2]);
  });

  it("список відбору йде магазинним списком статусів і рахує замовлення", () => {
    const options = orderFilterOptions(orders, STATUSES);

    expect(options[0]).toEqual({ key: null, label: "Усі статуси", count: 3 });
    expect(options[1]).toEqual({ key: "new", label: "Нове", count: 1 });
    expect(options.map((option) => option.key)).toEqual([
      null,
      "new",
      "confirmed",
      "sent",
      "done",
      "cancelled",
      "archive",
    ]);
  });

  it("порожній статус лишається в списку: «там нічого немає» — теж відповідь", () => {
    expect(orderFilterOptions([], STATUSES)[2].count).toBe(0);
  });

  it("історія з ключем, якого вже немає, дістає свій пункт і не ділить його з іншими", () => {
    const options = orderFilterOptions(orders, STATUSES);
    expect(orderFilterLabel("archive", options)).toBe("archive");
    expect(options[options.length - 1].count).toBe(1);
  });

  it("обране називається своїм словом — і «усі», і статус", () => {
    const options = orderFilterOptions(orders, STATUSES);
    expect(orderFilterLabel(null, options)).toBe("Усі статуси");
    expect(orderFilterLabel("done", options)).toBe("Виконано");
  });
});

describe("порядок черги", () => {
  const orders = [
    order({ id: 1, status: "done", createdAt: "2026-09-24 10:00:00" }),
    order({ id: 3, status: "new", createdAt: "2026-09-26 10:00:00" }),
    order({ id: 2, status: "sent", createdAt: "2026-09-25 10:00:00" }),
  ];

  it("нові спершу — типове: черга читається згори", () => {
    expect(sortOrders(orders, "new", STATUSES).map((item) => item.id)).toEqual([3, 2, 1]);
  });

  it("старі спершу — той самий список навиворіт", () => {
    expect(sortOrders(orders, "old", STATUSES).map((item) => item.id)).toEqual([1, 2, 3]);
  });

  it("за статусом — порядок роботи магазину, а всередині — новіші вгорі", () => {
    expect(sortOrders(orders, "status", STATUSES).map((item) => item.id)).toEqual([3, 2, 1]);
  });

  it("ключ без місця в списку стає в кінець, а не на початок", () => {
    const withArchive = [...orders, order({ id: 4, status: "archive" })];
    const sorted = sortOrders(withArchive, "status", STATUSES);
    expect(sorted[sorted.length - 1].id).toBe(4);
  });

  it("порядок — це новий список: черга на екрані не переставляється на місці", () => {
    const source = [...orders];
    sortOrders(source, "old", STATUSES);
    expect(source.map((item) => item.id)).toEqual([1, 3, 2]);
  });

  it("кожен порядок має своє слово", () => {
    expect(orderSortLabel("new")).toBe("Спочатку нові");
    expect(orderSortLabel("status")).toBe("За статусом");
  });
});

describe("що можна додати в замовлення", () => {
  function product(id: number): ShopProduct {
    return {
      id,
      shopId: 3,
      slug: `p-${id}`,
      kind: "physical",
      title: `Товар ${id}`,
      category: "",
      summary: "",
      description: "",
      price: "150 ₴",
      images: [],
      attributes: [],
      isActive: true,
      createdAt: "",
      updatedAt: "",
    };
  }

  it("товар, який уже стоїть позицією, у списку додавання не повторюється", () => {
    const items = [{ productId: 5, title: "Рецепти", price: "150 ₴", kind: "digital", qty: 2 }];
    expect(addableProducts([product(5), product(6)], items).map((item) => item.id)).toEqual([6]);
  });

  it("рядок без номера товару не ховає нічого: його немає за чим виключати", () => {
    const items = [{ productId: null, title: "Стара позиція", price: "", kind: "", qty: 1 }];
    expect(addableProducts([product(5)], items)).toHaveLength(1);
  });
});
