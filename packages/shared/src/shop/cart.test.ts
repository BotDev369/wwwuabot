/**
 * Кошик: те, що набрано, і те, що з цього можна порахувати.
 *
 * Головне тут — **межа між кошиком і замовленням**. Кошик нічого не вирішує про
 * ціну: вона в магазині текст, і «договірна» — це ціна, а не порожнє місце
 * (`docs/SHOPS.md` §6). Друге — кількості: вони ті самі, що приймає сервер,
 * інакше покупець дізнався б про межу на останньому кроці.
 *
 * @module @wwwuabot/shared/shop
 */

import { describe, expect, it } from "vitest";
import {
  amountLabel,
  cartAdd,
  cartCount,
  cartLineTotal,
  cartLines,
  cartNeedsShipping,
  cartProducts,
  cartRemove,
  cartSetQty,
  cartTotal,
  parsePriceAmount,
  priceCurrency,
} from "./cart";
import { ORDER_ITEMS_MAX, ORDER_QTY_MAX } from "./orders";
import type { ShopProduct } from "./types";

function product(over: Partial<ShopProduct> = {}): ShopProduct {
  return {
    id: 1,
    shopId: 10,
    slug: "kava",
    kind: "physical",
    title: "Кава",
    category: "",
    summary: "",
    description: "",
    price: "320 ₴",
    images: [],
    attributes: [],
    isActive: true,
    createdAt: "",
    updatedAt: "",
    ...over,
  };
}

describe("що робить повторний дотик", () => {
  it("додає, а не замінює кількість — покупець торкнувся двічі", () => {
    expect(cartAdd(cartAdd([], 1), 1)).toEqual([{ productId: 1, qty: 2 }]);
  });

  it("тримає стелю кількості: більше сервер не прийме", () => {
    const lines = cartAdd([], 1, ORDER_QTY_MAX + 50);

    expect(lines[0].qty).toBe(ORDER_QTY_MAX);
  });

  it("спиняє ріст списку стелею позицій", () => {
    let lines: ReturnType<typeof cartAdd> = [];
    for (let id = 1; id <= ORDER_ITEMS_MAX + 5; id++) lines = cartAdd(lines, id);

    expect(lines).toHaveLength(ORDER_ITEMS_MAX);
  });

  it("номер, якого не буває в товару, у кошик не потрапляє", () => {
    expect(cartAdd([], 0)).toEqual([]);
    expect(cartAdd([], -3)).toEqual([]);
  });
});

describe("правка кошика", () => {
  it("кількість нуль — це видалення, а не позиція з нулем", () => {
    expect(cartSetQty([{ productId: 1, qty: 3 }], 1, 0)).toEqual([]);
  });

  it("кількість на кнопці — сума одиниць, а не кількість позицій", () => {
    expect(
      cartCount([
        { productId: 1, qty: 2 },
        { productId: 2, qty: 3 },
      ]),
    ).toBe(5);
  });

  it("прибрати можна лише те, що в кошику", () => {
    expect(cartRemove([{ productId: 1, qty: 1 }], 9)).toEqual([{ productId: 1, qty: 1 }]);
  });
});

describe("товари кошика", () => {
  it("зниклий товар не лишає по собі позиції в замовленні", () => {
    const products = [product({ id: 2 })];

    expect(
      cartProducts(
        [
          { productId: 1, qty: 1 },
          { productId: 2, qty: 1 },
        ],
        products,
      ),
    ).toHaveLength(1);
    expect(
      cartLines(
        [
          { productId: 1, qty: 1 },
          { productId: 2, qty: 1 },
        ],
        products,
      ),
    ).toEqual([{ productId: 2, qty: 1 }]);
  });

  it("доставку просить будь-яка фізична позиція — навіть у змішаному кошику", () => {
    const products = [product({ id: 1, kind: "digital" }), product({ id: 2, kind: "physical" })];

    expect(cartNeedsShipping([{ productId: 1, qty: 1 }], products)).toBe(false);
    expect(
      cartNeedsShipping(
        [
          { productId: 1, qty: 1 },
          { productId: 2, qty: 1 },
        ],
        products,
      ),
    ).toBe(true);
  });
});

describe("ціна — текст, і сума це враховує", () => {
  it("число з ціни береться, навіть коли поруч є слово", () => {
    expect(parsePriceAmount("2 000 ₴")).toBe(2000);
    expect(parsePriceAmount("від 300 грн")).toBe(300);
    expect(parsePriceAmount("149,50 ₴")).toBe(149.5);
  });

  it("«договірна» — не нуль: числа в ній немає", () => {
    expect(parsePriceAmount("договірна")).toBeNull();
    expect(parsePriceAmount("")).toBeNull();
  });

  it("разом — сума того, що порахувати можна, і позначка неповноти", () => {
    const products = [product({ id: 1, price: "320 ₴" }), product({ id: 2, price: "договірна" })];
    const total = cartTotal(
      [
        { productId: 1, qty: 2 },
        { productId: 2, qty: 1 },
      ],
      products,
    );

    expect(total).toEqual({ amount: 640, hasUnknown: true, count: 3, currency: "₴" });
  });

  it("самі домовленості лишають суму без числа, а не з нулем", () => {
    const products = [product({ id: 1, price: "договірна" })];
    const total = cartTotal([{ productId: 1, qty: 1 }], products);

    expect(total.amount).toBeNull();
    expect(total.hasUnknown).toBe(true);
  });

  it("товар, якого немає в магазині, у суму не входить", () => {
    const total = cartTotal([{ productId: 1, qty: 5 }], []);

    expect(total).toEqual({ amount: null, hasUnknown: false, count: 0, currency: null });
  });
});

describe("одиниця грошей — з ціни, а не з платформи", () => {
  it("одиницю називає сама ціна", () => {
    expect(priceCurrency("USD 6.00")).toBe("USD");
    expect(priceCurrency("6,00 eur")).toBe("EUR");
    expect(priceCurrency("320 ₴")).toBe("₴");
    expect(priceCurrency("$6")).toBe("$");
  });

  it("слово без числа одиниці не називає: «USD» — не ціна", () => {
    expect(priceCurrency("USD")).toBeNull();
    expect(priceCurrency("договірна")).toBeNull();
    expect(priceCurrency("150")).toBeNull();
  });

  it("сума магазину в доларах не стає гривневою", () => {
    const products = [product({ id: 1, price: "USD 6.00" }), product({ id: 2, price: "$2.40" })];
    const total = cartTotal([{ productId: 1, qty: 2 }], products);

    expect(total).toEqual({ amount: 12, hasUnknown: false, count: 2, currency: "USD" });
  });

  it("різні одиниці в позиціях лишають суму без валюти: додавати їх не можна", () => {
    const products = [product({ id: 1, price: "320 ₴" }), product({ id: 2, price: "USD 6.00" })];
    const total = cartTotal(
      [
        { productId: 1, qty: 1 },
        { productId: 2, qty: 1 },
      ],
      products,
    );

    expect(total.amount).toBe(326);
    expect(total.currency).toBeNull();
  });

  it("ціна без одиниці рахується як наша: «150» — це гривні", () => {
    const total = cartTotal([{ productId: 1, qty: 2 }], [product({ id: 1, price: "150" })]);

    expect(total.currency).toBe("₴");
  });
});

describe("сума позиції в плитці", () => {
  it("сума з розділювачами розрядів", () => {
    expect(amountLabel(1250)).toBe("1\u00a0250 ₴");
  });

  it("знак валюти стоїть так, як його пишуть самі гроші", () => {
    expect(amountLabel(18, "USD")).toBe("18 USD");
    expect(amountLabel(18, "$")).toBe("$18");
    expect(amountLabel(1250, "₴")).toBe("1\u00a0250 ₴");
    expect(amountLabel(18, "")).toBe("18");
  });

  it("ціна × кількість — те, що покупець бачить у плитці", () => {
    expect(cartLineTotal("150 ₴", 2)).toBe(300);
    expect(cartLineTotal("1 250 ₴", 3)).toBe(3750);
  });

  it("у ціні без числа суми немає: нуль був би безкоштовним замовленням", () => {
    expect(cartLineTotal("договірна", 4)).toBeNull();
    expect(cartLineTotal("за домовленістю", 1)).toBeNull();
  });
});
