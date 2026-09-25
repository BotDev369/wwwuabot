/**
 * Вітрина — те, що мусить звучати однаково в кожному її куточку.
 *
 * Тут перевіряється саме **слово**, а не розмітка: сума кошика не має права
 * виглядати як ціна замовлення (її називає продавець), «Інші товари» мусять
 * читатись як розділ, а пошук — не обіцяти відбір за ціною.
 *
 * @module web-platform-dev/src/pages/shop/store
 */

import { describe, expect, it } from "vitest";
import type { PageConfig } from "@wwwuabot/shared/types/page-config";
import type { ShopCard } from "@wwwuabot/shared/shop";
import {
  amountLabel,
  cartCountLabel,
  cartTotalLabel,
  filterCards,
  foundLabel,
  plural,
  storeStatsLabel,
  storeTagline,
} from "./store-view";

function card(over: Partial<ShopCard> = {}): ShopCard {
  return {
    id: 1,
    title: "Еспресо-суміш",
    price: "320 ₴",
    photoUrl: null,
    kindLabel: "Фізичний товар",
    summary: "Темне обсмаження",
    category: "Кава",
    ...over,
  };
}

describe("підзаголовок вітрини", () => {
  const config: PageConfig = {
    version: 1,
    zones: {
      header: [],
      main: [
        { id: "head", type: "text", order: 0, props: { title: "Кава на розі", level: "h1" } },
        {
          id: "tagline",
          type: "text",
          order: 1,
          props: { title: "Смажимо щочерверга", level: "h3" },
        },
      ],
      sidebar: [],
      footer: [],
    },
  };

  it("бере короткий опис, а не назву магазину", () => {
    expect(storeTagline(config)).toBe("Смажимо щочерверга");
  });

  it("знаходить опис і тоді, коли він усередині картки", () => {
    const nested: PageConfig = {
      ...config,
      zones: {
        ...config.zones,
        main: [
          {
            id: "head",
            type: "card",
            order: 0,
            props: {},
            children: [
              { id: "t", type: "text", order: 0, props: { title: "Під заголовком", level: "h3" } },
            ],
          },
        ],
      },
    };

    expect(storeTagline(nested)).toBe("Під заголовком");
  });

  it("сторінка без опису — порожній рядок, а не «undefined»", () => {
    expect(storeTagline(null)).toBe("");
    expect(
      storeTagline({ version: 1, zones: { header: [], main: [], sidebar: [], footer: [] } }),
    ).toBe("");
  });
});

describe("відбір товарів", () => {
  const cards = [
    card({ id: 1, title: "Еспресо-суміш", category: "Кава" }),
    card({ id: 2, title: "Керамічна чашка", category: "Посуд", summary: "Ручна робота" }),
  ];

  it("розділ показує лише свій — «усі» це порожній ключ", () => {
    expect(filterCards(cards, "Кава", "").map((item) => item.id)).toEqual([1]);
    expect(filterCards(cards, null, "")).toHaveLength(2);
  });

  it("пошук дивиться в назву, опис і розділ", () => {
    expect(filterCards(cards, null, "чашка").map((item) => item.id)).toEqual([2]);
    expect(filterCards(cards, null, "ручна").map((item) => item.id)).toEqual([2]);
    expect(filterCards(cards, null, "кава").map((item) => item.id)).toEqual([1]);
  });

  it("розділ і пошук діють разом, а не замінюють один одного", () => {
    expect(filterCards(cards, "Кава", "чашка")).toEqual([]);
  });
});

describe("число з правильним словом", () => {
  it("три форми українського слова", () => {
    expect(plural(1, ["товар", "товари", "товарів"])).toBe("товар");
    expect(plural(3, ["товар", "товари", "товарів"])).toBe("товари");
    expect(plural(5, ["товар", "товари", "товарів"])).toBe("товарів");
    expect(plural(11, ["товар", "товари", "товарів"])).toBe("товарів");
    expect(plural(21, ["товар", "товари", "товарів"])).toBe("товар");
  });

  it("довідка шапки читається як число, а не як речення", () => {
    expect(storeStatsLabel(3, 1)).toBe("3 товари · 1 розділ");
    expect(storeStatsLabel(0, 0)).toBe("0 товарів · 0 розділів");
  });
});

describe("сума кошика", () => {
  it("сума з розділювачами розрядів", () => {
    expect(amountLabel(1250)).toBe("1\u00a0250 ₴");
  });

  it("самі домовленості — це не нуль, а слово", () => {
    expect(cartTotalLabel({ amount: null, hasUnknown: true, count: 1 })).toBe(
      "Ціну узгодить продавець",
    );
  });

  it("неповна сума позначена, а не показана як повна", () => {
    expect(cartTotalLabel({ amount: 640, hasUnknown: true, count: 3 })).toBe(
      "640 ₴ + договірні позиції",
    );
    expect(cartTotalLabel({ amount: 640, hasUnknown: false, count: 3 })).toBe("640 ₴");
  });

  it("порожній кошик не називає числа на кнопці", () => {
    expect(cartCountLabel(0)).toBe("Кошик");
    expect(cartCountLabel(2)).toBe("Кошик · 2");
  });

  it("скільки показано — теж словами", () => {
    expect(foundLabel(2)).toBe("Показано: 2 товари");
    expect(foundLabel(1)).toBe("Показано: 1 товар");
  });
});
