/**
 * Замовлення так, як його читає екран — один переклад для списку й підписів.
 *
 * **Статус показується підписом магазину, а не ключем.** У рядку лежить ключ
 * (`new`, `done`, …), а підпис людина переписує під свій процес
 * (`docs/SHOPS.md` §7), тож переклад робить спільне правило
 * (`orderStatusLabel`) — і воно ж терпить ключ, якого в магазині вже немає.
 *
 * **Контакт читається тими самими підписами, якими його питали.** Пари полів
 * дає `orderContactFields` за **видами позицій цього замовлення**: склад
 * замовлення — це знімок, тож за ним і видно, питали адресу чи канал. Другого
 * переліку підписів не заводимо: «Адреса доставки» в формі й у картці мусить
 * бути одним словом (`AGENTS.md` §7).
 *
 * @module web-platform-dev/src/pages/shop
 */

import {
  orderContactFields,
  orderItemsLabel,
  orderNeedsShipping,
  orderStatusLabel,
  type OrderStatus,
  type ShopOrder,
} from "@wwwuabot/shared/shop";

/** Рядок контакту для показу: підпис поля й значення. */
export interface OrderContactLine {
  label: string;
  value: string;
}

/** Позиції одним рядком — той самий переклад, що в позначці розмови. */
export function orderItemsLine(order: ShopOrder): string {
  return orderItemsLabel(order.items);
}

/** Другий рядок у списку: статус і скільки позицій. */
export function orderHint(order: ShopOrder, statuses: readonly OrderStatus[]): string {
  return `${orderStatusLabel(order.status, statuses)} · Позицій: ${order.items.length}`;
}

/**
 * Контакт покупця рядками — у тому порядку, у якому його питали.
 *
 * Невідомий ключ (поле, якого в переліку вже немає) показується як є: замовлення
 * старше за правку форми, і його контакт мусить лишитись читаним.
 */
export function orderContactLines(order: ShopOrder): OrderContactLine[] {
  const labels = new Map(
    orderContactFields(orderNeedsShipping(order.items.map((item) => item.kind))).map((field) => [
      field.key,
      field.label,
    ]),
  );

  return Object.entries(order.contact)
    .filter(([, value]) => value.trim() !== "")
    .map(([key, value]) => ({ label: labels.get(key) ?? key, value }));
}

/** Підпис під списком замовлень: порожній список — це стан, а не помилка. */
export function shopOrdersHint(loading: boolean, count: number): string {
  if (loading) return "Завантаження замовлень…";
  if (count === 0) return "Замовлень ще немає. Вони зʼявляться тут, щойно хтось замовить товар.";
  return `Замовлень: ${count}`;
}
