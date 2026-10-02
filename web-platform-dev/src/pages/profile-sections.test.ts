/**
 * Розділи хабу профілю — те, що лишилось після переїзду.
 *
 * Хаб звузився до «Замовлень», і саме це легко зіпсувати непомітно: досить
 * повернути сюди список інструментів — і знову з'явиться **друга** навігація
 * по тих самих екранах, які вже мають свій хаб «Створити». Окремо тримаємо
 * те, що «Тема» **не** повертається сюди пунктом: вона в хедері, і два входи
 * в одну дію означають, що за один із них забудуть.
 *
 * @module web-platform-dev/src/pages/profile-sections.test
 */

import { describe, expect, it, vi } from "vitest";
import { buildProfileSections } from "./profile-sections";

const onOpenOrders = vi.fn();

const base = { onOpenOrders };

describe("розділи хабу профілю", () => {
  const items = buildProfileSections({ ...base, hasShops: true });

  it("⛔ у хабі немає пункту «Тема» — вона в хедері на кожному екрані", () => {
    expect(items.map((item) => item.key)).toEqual(["orders"]);
  });

  it("без жодного магазину хаб порожній, а не показує обіцянку роботи", () => {
    expect(buildProfileSections({ ...base, hasShops: false })).toEqual([]);
  });

  it("«Замовлення» — дія, а не адреса (шлях знає той, хто кличе)", () => {
    const orders = items[0];
    expect(orders.href).toBeUndefined();
    orders.onSelect?.();
    expect(onOpenOrders).toHaveBeenCalledOnce();
  });

  it("жодного підписа «Мій / Мої»", () => {
    // Хаб відкривають зі свого профілю, тож приналежність очевидна — а префікс
    // лише відсуває те слово, за яким пункт упізнають.
    for (const item of items) expect(item.label, item.key).not.toMatch(/^Мо[їй]/);
  });
});
