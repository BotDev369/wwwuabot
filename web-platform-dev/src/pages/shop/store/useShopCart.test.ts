/**
 * Кошик у сховищі браузера: читається так само обережно, як чужий ввід.
 *
 * Запис у сховищі — не наше поле: його могли лишити стара версія продукту,
 * інша вкладка або людина з відкритою консоллю. Тому перевіряється саме те, що
 * зіпсований запис **не ламає вітрину** й не показує товар без номера.
 *
 * @module web-platform-dev/src/pages/shop/store
 */

import { describe, expect, it } from "vitest";
import { cartStorageKey, readCart } from "./useShopCart";

describe("ключ сховища", () => {
  it("кошики двох магазинів — різні записи", () => {
    expect(cartStorageKey("kava")).not.toBe(cartStorageKey("chai"));
    expect(cartStorageKey("kava")).toContain("kava");
  });
});

describe("читання кошика зі сховища", () => {
  it("звичайний запис читається як є", () => {
    expect(readCart('[{"productId":7,"qty":2}]')).toEqual([{ productId: 7, qty: 2 }]);
  });

  it("дурниця замість кошика — це порожній кошик, а не помилка", () => {
    expect(readCart(null)).toEqual([]);
    expect(readCart("")).toEqual([]);
    expect(readCart("{")).toEqual([]);
    expect(readCart('"рядок"')).toEqual([]);
    expect(readCart("[1,2,3]")).toEqual([]);
  });

  it("товар без номера в кошик не потрапляє", () => {
    expect(readCart('[{"qty":2},{"productId":0,"qty":1},{"productId":4.5,"qty":1}]')).toEqual([]);
  });

  it("повтор номера складається, а не лишає останню кількість", () => {
    expect(readCart('[{"productId":7,"qty":2},{"productId":7,"qty":3}]')).toEqual([
      { productId: 7, qty: 5 },
    ]);
  });

  it("кількість без числа вважається одиницею — товар у кошику вже вибрано", () => {
    expect(readCart('[{"productId":7}]')).toEqual([{ productId: 7, qty: 1 }]);
  });

  it("кількість понад стелю притискається до неї", () => {
    expect(readCart('[{"productId":7,"qty":100000}]')[0].qty).toBe(99);
  });
});
