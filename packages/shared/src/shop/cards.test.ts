/**
 * Картка товару: те, що видно покупцеві в сітці, і те, чого в ній **не** видно.
 *
 * Головне тут — чернетка. `productCards` віддає рівно показане, тож товар,
 * вимкнений продавцем, не потрапляє в сітку навіть тоді, коли його передали
 * функції: відсів стоїть у перекладі, а не в тому, хто кличе
 * (`packages/ui/src/blocks/ShopGridBlock.tsx`, `docs/SHOPS.md` §3).
 *
 * @module @wwwuabot/shared/shop
 */

import { describe, expect, it } from "vitest";
import {
  mediaById,
  productCards,
  productCover,
  productPhotos,
  productPriceLabel,
  shopCatalogs,
} from "./cards";
import type { ShopMedia, ShopProduct } from "./types";

function product(over: Partial<ShopProduct> = {}): ShopProduct {
  return {
    id: 1,
    shopId: 10,
    slug: "kava",
    kind: "physical",
    title: "Кава на розі",
    category: "Кава",
    summary: "Темне обсмаження",
    description: "",
    price: "320 ₴",
    images: [],
    attributes: [],
    isActive: true,
    createdAt: "2026-09-25T00:00:00.000Z",
    updatedAt: "2026-09-25T00:00:00.000Z",
    ...over,
  };
}

function file(over: Partial<ShopMedia> = {}): ShopMedia {
  return {
    id: 7,
    shopId: 10,
    key: "shop/10/abc-kava.jpg",
    mime: "image/jpeg",
    bytes: 1024,
    kind: "image",
    createdAt: "2026-09-25T00:00:00.000Z",
    ...over,
  };
}

describe("ціна в картці", () => {
  it("порожня ціна читається словами, а не порожнім місцем", () => {
    expect(productPriceLabel("   ")).toBe("Ціна не вказана");
  });

  it("«договірна» — це теж ціна, а не її відсутність", () => {
    expect(productPriceLabel("договірна")).toBe("договірна");
  });
});

describe("фото товару", () => {
  it("галерея йде за номерами, перше фото — головне", () => {
    const media = [
      file({ id: 7, key: "shop/10/first.jpg" }),
      file({ id: 8, key: "shop/10/second.jpg" }),
    ];
    const item = product({ images: [8, 7] });

    expect(productPhotos(item, media).map((f) => f.key)).toEqual([
      "shop/10/second.jpg",
      "shop/10/first.jpg",
    ]);
    expect(productCover(item, media)?.key).toBe("shop/10/second.jpg");
  });

  it("номер, якого немає серед файлів, пропускається — не бита картинка", () => {
    const item = product({ images: [99, 7] });

    expect(productPhotos(item, [file({ id: 7 })]).map((f) => f.id)).toEqual([7]);
  });

  it("товар без фото не має головного — і картка це витримає", () => {
    expect(productCover(product(), [])).toBeNull();
  });

  it("файли шукаються за номерами, а не за порядком у списку", () => {
    const byId = mediaById([file({ id: 7 }), file({ id: 8 })]);

    expect(byId.get(8)?.id).toBe(8);
    expect(byId.get(9)).toBeUndefined();
  });
});

describe("товари → сітка", () => {
  it("⛔ чернетка карткою не стає", () => {
    const cards = productCards(
      [product({ id: 1, title: "Видно" }), product({ id: 2, title: "Чернетка", isActive: false })],
      [],
    );

    expect(cards.map((card) => card.title)).toEqual(["Видно"]);
  });

  it("картка несе готову адресу фото, а не ключ R2", () => {
    const cards = productCards([product({ images: [7] })], [file({ id: 7 })]);

    expect(cards[0].photoUrl).toBe("/api/shop/media/shop/10/abc-kava.jpg");
  });

  it("без фото картка лишається карткою: `null`, а не порожній рядок", () => {
    const cards = productCards([product()], []);

    expect(cards[0].photoUrl).toBeNull();
    // І вид теж словом: за ним покупець розуміє, як товар отримати.
    expect(cards[0].kindLabel).toBeTruthy();
  });

  it("порожній опис лишається порожнім — розмітка бере вид замість нього", () => {
    const cards = productCards([product({ summary: "" })], []);

    expect(cards[0].summary).toBe("");
  });

  it("розділ товару їде в картку, а порожній читається як «Інші товари»", () => {
    const cards = productCards(
      [product({ id: 1, category: "Чай" }), product({ id: 2, category: "  " })],
      [],
    );

    expect(cards.map((card) => card.category)).toEqual(["Чай", "Інші товари"]);
  });
});

describe("розділи каталогу", () => {
  it("розділ — це назва товару, а не окремий рядок: їх рівно стільки, скільки назв", () => {
    const groups = shopCatalogs([
      product({ id: 1, category: "Кава" }),
      product({ id: 2, category: "Кава" }),
      product({ id: 3, category: "Посуд" }),
    ]);

    expect(groups).toEqual([
      { title: "Кава", count: 2 },
      { title: "Посуд", count: 1 },
    ]);
  });

  it("товар без розділу стоїть останнім — «Інші товари»", () => {
    const groups = shopCatalogs([
      product({ id: 1, category: "" }),
      product({ id: 2, category: "Кава" }),
    ]);

    expect(groups.map((group) => group.title)).toEqual(["Кава", "Інші товари"]);
  });

  it("порожні розділи не показуються: чернетка не створює розділу", () => {
    const groups = shopCatalogs([product({ id: 1, category: "Кава", isActive: false })]);

    expect(groups).toEqual([]);
  });
});
