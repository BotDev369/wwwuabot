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
 * **Колір, відбір і порядок — теж подання, а не розмітка.** Чергу ведуть: її
 * фільтрують за статусом і впорядковують за часом чи за роботою. Усе це — чисті
 * функції, бо помилка тут не видна оком: «показано 3 із 3» при відборі — це вже
 * брехня екрана, а не смак.
 *
 * @module web-platform-dev/src/pages/shop
 */

import {
  orderContactFields,
  orderItemsLabel,
  orderNeedsShipping,
  orderStatusLabel,
  type OrderItem,
  type OrderStatus,
  type ShopOrder,
  type ShopProduct,
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

/**
 * Підпис під списком замовлень: порожній список — це стан, а не помилка.
 *
 * Два числа, а не одне, бо список буває **відібраний**: «Знайдено: 2 із 7» каже
 * і скільки показано, і скільки всього, а саме «Замовлень: 2» під відбором
 * читалось би як «у магазині два замовлення».
 */
export function shopOrdersHint(loading: boolean, shown: number, total: number): string {
  if (loading) return "Завантаження замовлень…";
  if (total === 0) return "Замовлень ще немає. Вони зʼявляться тут, щойно хтось замовить товар.";
  return shown === total ? `Замовлень: ${total}` : `Знайдено: ${shown} із ${total}`;
}

/* ── Колір статусу ──────────────────────────────────────────────────────── */

/**
 * Тон картки замовлення — чотири стани роботи, а не стільки ж відтінків.
 *
 * `new` — те, що чекає на тебе; `work` — у роботі; `done` — завершено;
 * `cancelled` — закрито без виконання. Клас на картці — `shop-order--<тон>`
 * (`packages/shared/src/styles/shop.css`), а не колір інлайном: тему людина
 * обирає сама, тож фарбувати треба **токенами**, а не значеннями.
 */
export type OrderTone = "new" | "work" | "done" | "cancelled";

/**
 * Тон типових статусів — **за ключем**, і це головне.
 *
 * Ключ — контракт, який не міняється ніколи, а підпис магазин переписує як
 * завгодно (`statuses.ts`). Тому «Нове» → «Прийнято» лишає ту саму фарбу: колір
 * належить роботі, а не слову.
 */
const STATUS_TONES: Readonly<Record<string, OrderTone>> = {
  new: "new",
  confirmed: "work",
  sent: "work",
  done: "done",
  cancelled: "cancelled",
};

/**
 * Колір замовлення за ключем статусу.
 *
 * **Власний статус бере тон зі стадії, а не зі слова.** Слово магазин пише сам,
 * тож шукати в ньому «скас» означало б вирішувати за нього: статус із закритою
 * стадією читається як завершений (зелений), і це чесніше за вгадування за
 * назвою. Ключ, якого в магазині вже немає (історія старіша за правку списку),
 * фарбується як робота — він точно не новий.
 */
export function orderStatusTone(status: string, statuses: readonly OrderStatus[]): OrderTone {
  const known = STATUS_TONES[status];
  if (known) return known;

  const stage = statuses.find((entry) => entry.key === status)?.stage;
  return stage === "closed" ? "done" : "work";
}

/* ── Відбір і порядок ───────────────────────────────────────────────────── */

/** «Усі статуси» — стан черги за замовчуванням, а не ще один статус серед інших. */
export const ORDER_FILTER_ALL = "Усі статуси";

/** Пункт вибору статусу: ключ (`null` — усі), підпис і число замовлень у ньому. */
export interface OrderFilterOption {
  key: string | null;
  label: string;
  count: number;
}

/**
 * Список відбору за статусом — **із числами**, і вони рахуються з живого списку.
 *
 * Порожні статуси лишаються в списку, і це навмисно: це черга роботи, і «Скасовано
 * · 0» — це відповідь на питання («там нічого немає»), а не порожній пункт.
 * Список статусів — магазинний, а не з клієнта (§7), тож підписи тут ті самі, що
 * на кнопках замовлення. Ключі, яких у списку вже немає, але які лишились у
 * замовленнях, **додаються вниз**: історія мусить мати свій фільтр.
 */
export function orderFilterOptions(
  orders: readonly ShopOrder[],
  statuses: readonly OrderStatus[],
): OrderFilterOption[] {
  const counts = new Map<string, number>();
  for (const order of orders) counts.set(order.status, (counts.get(order.status) ?? 0) + 1);

  const options: OrderFilterOption[] = [
    { key: null, label: ORDER_FILTER_ALL, count: orders.length },
  ];
  const seen = new Set<string>();
  for (const status of statuses) {
    seen.add(status.key);
    options.push({ key: status.key, label: status.label, count: counts.get(status.key) ?? 0 });
  }
  for (const order of orders) {
    if (seen.has(order.status)) continue;
    seen.add(order.status);
    options.push({
      key: order.status,
      label: orderStatusLabel(order.status, statuses),
      count: counts.get(order.status) ?? 0,
    });
  }

  return options;
}

/** Підпис вибору статусу: обране називається своїм словом, а не «Усі». */
export function orderFilterLabel(
  status: string | null,
  options: readonly OrderFilterOption[],
): string {
  if (status === null) return ORDER_FILTER_ALL;
  return options.find((option) => option.key === status)?.label ?? status;
}

/** Показати лише замовлення одного статусу; `null` — усі. */
export function filterOrders(orders: readonly ShopOrder[], status: string | null): ShopOrder[] {
  if (status === null) return [...orders];
  return orders.filter((order) => order.status === status);
}

/**
 * Порядок черги: за часом (нові чи старі спершу) або **за роботою**.
 *
 * «За статусом» — це порядок списку статусів магазину, а не абетка: саме так
 * черга читається роботою («спершу те, що не підтверджено»), і саме тому ключі
 * без місця в списку (історія) стають у кінець. Усередині одного статусу
 * порядок той самий — новіші вгорі.
 */
export type OrderSort = "new" | "old" | "status";

export const ORDER_SORTS: readonly OrderSort[] = ["new", "old", "status"];

const SORT_LABELS: Readonly<Record<OrderSort, string>> = {
  new: "Спочатку нові",
  old: "Спочатку старі",
  status: "За статусом",
};

export function orderSortLabel(sort: OrderSort): string {
  return SORT_LABELS[sort];
}

export function sortOrders(
  orders: readonly ShopOrder[],
  sort: OrderSort,
  statuses: readonly OrderStatus[],
): ShopOrder[] {
  const items = [...orders];
  // Час у базі — `datetime('now')` одним форматом, тож рядки порівнюються як
  // дати; номер розв'язує те саме замовлення в ту саму мить.
  const oldestFirst = (a: ShopOrder, b: ShopOrder): number =>
    a.createdAt.localeCompare(b.createdAt) || a.id - b.id;

  if (sort === "old") return items.sort(oldestFirst);
  if (sort === "new") return items.sort((a, b) => oldestFirst(b, a));

  const rank = (key: string): number => {
    const index = statuses.findIndex((status) => status.key === key);
    return index === -1 ? statuses.length : index;
  };
  return items.sort((a, b) => rank(a.status) - rank(b.status) || oldestFirst(b, a));
}

/**
 * Позиція на **екрані правки**: той самий знімок, але з позначкою.
 *
 * Позначка потрібна саме тому, що позиція буває двох родів: та, що вже лежить у
 * замовленні (її знімок — історія, і міняється тільки кількість), і щойно додана
 * (знімок для неї дасть база, `docs/SHOPS.md` §6). Одним списком ці два роди не
 * розрізнити — і саме тому правка надсилає їх **двома** полями.
 */
export interface EditableOrderItem extends OrderItem {
  /** `true` — позицію додали щойно: у замовленні її ще немає. */
  isNew: boolean;
}

/**
 * Товари, які ще можна додати в замовлення.
 *
 * Уже вибрані виключаються: вони вже стоять позицією, і другу таку саму продавець
 * додає **кроком кількості** в тій самій позиції. Чернетки серед них є — продавець
 * править уже прийняте замовлення, і прибраний із каталогу товар у ньому лишається
 * (та сама різниця з покупцем, що в сервісі).
 */
export function addableProducts(
  products: readonly ShopProduct[],
  items: readonly OrderItem[],
): ShopProduct[] {
  const inOrder = new Set(
    items.map((item) => item.productId).filter((id): id is number => id !== null),
  );
  return products.filter((product) => !inOrder.has(product.id));
}
