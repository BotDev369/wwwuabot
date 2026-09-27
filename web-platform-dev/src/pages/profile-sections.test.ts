/**
 * Розділи хабу профілю — те, що лишилось після переїзду.
 *
 * Хаб звузився до «Теми» й «Замовлень», і саме це легко зіпсувати непомітно:
 * досить повернути сюди список інструментів — і знову з'явиться **друга**
 * навігація по тих самих екранах, які вже мають свій хаб «Створити». Тест
 * тримає три речі: що в хабу рівно те, що про людину, що «Тема» лишається
 * **дією**, а не адресою, і що «Замовлення» з'являється лише там, де справді
 * є магазин.
 *
 * @module web-platform-dev/src/pages/profile-sections.test
 */

import { describe, expect, it, vi } from "vitest";
import { buildProfileSections } from "./profile-sections";

const onOpenTheme = vi.fn();
const onOpenOrders = vi.fn();

const base = { onOpenTheme, onOpenOrders };

describe("розділи хабу профілю", () => {
  const items = buildProfileSections({ ...base, hasShops: true });

  it("«Тема» й «Замовлення»: інструменти людини переїхали в хаб «Створити»", () => {
    expect(items.map((item) => item.key)).toEqual(["theme", "orders"]);
  });

  it("без жодного магазину пункт «Замовлення» не обіцяє роботи, якої немає", () => {
    expect(buildProfileSections({ ...base, hasShops: false }).map((item) => item.key)).toEqual([
      "theme",
    ]);
  });

  it("«Замовлення» — дія, а не адреса (шлях знає той, хто кличе)", () => {
    const orders = items[1];
    expect(orders.href).toBeUndefined();
    orders.onSelect?.();
    expect(onOpenOrders).toHaveBeenCalledOnce();
  });

  it("«Тема» — дія, а не адреса", () => {
    const theme = items[0];
    expect(theme.href).toBeUndefined();
    theme.onSelect?.();
    expect(onOpenTheme).toHaveBeenCalledOnce();
  });

  it("жодного підписа «Мій / Мої»", () => {
    // Хаб відкривають зі свого профілю, тож приналежність очевидна — а префікс
    // лише відсуває те слово, за яким пункт упізнають.
    for (const item of items) expect(item.label, item.key).not.toMatch(/^Мо[їй]/);
  });
});
