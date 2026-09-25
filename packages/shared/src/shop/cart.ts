/**
 * Кошик покупця — те, що набрано на вітрині, поки не стало замовленням.
 *
 * **Кошик — це номери товарів і кількості, і нічого більше.** Ні назв, ні цін
 * тут не тримають: ціну називає база на момент замовлення (`docs/SHOPS.md` §6),
 * а копія ціни в кошику показала б покупцеві одну суму, а в замовленні лягла б
 * інша. Кошик живе в пам'яті покупця (і переживає перезавантаження сторінки
 * тим самим списком), а історією володіє продавець.
 *
 * **Межі ті самі, що в прийомі замовлення** (`ORDER_ITEMS_MAX`,
 * `ORDER_QTY_MAX`): кошик, який дозволяє набрати більше, ніж сервер приймає,
 * відмовляв би покупцеві на останньому кроці — після того, як він усе вибрав.
 *
 * **Сума — допоміжна, а не обіцянка.** Ціна в магазині — **текст** («2 000 ₴»,
 * «договірна»), тож разом рахується лише з того, що взагалі є числом, і
 * замовлення з невідомою ціною каже про це словом, а не вигаданою цифрою.
 *
 * @module @wwwuabot/shared/shop
 */

import { ORDER_ITEMS_MAX, ORDER_QTY_MAX, orderNeedsShipping } from "./orders";
import type { OrderItemInput } from "./orders";
import type { ShopProduct } from "./types";

/** Позиція кошика: товар і скільки його взяли. */
export interface CartLine {
  productId: number;
  qty: number;
}

/** Кількість у межах, які приймає сервер: 1…`ORDER_QTY_MAX`. */
function clampQty(raw: number): number {
  const value = Math.floor(Number(raw));
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.min(value, ORDER_QTY_MAX);
}

/**
 * Додати товар; повторний дотик **додає**, а не замінює кількість.
 *
 * Те саме правило, що в прийомі замовлення (`cleanOrderItems`): покупець, який
 * торкнувся двічі, замовив два — і мовчазне «останній переміг» зменшило б
 * кошик без його відома. Стеля позицій спиняє ріст списку, а не кількості.
 */
export function cartAdd(lines: CartLine[], productId: number, qty = 1): CartLine[] {
  if (!Number.isInteger(productId) || productId <= 0) return lines;

  const existing = lines.find((line) => line.productId === productId);
  if (existing) {
    return lines.map((line) =>
      line.productId === productId ? { ...line, qty: clampQty(line.qty + clampQty(qty)) } : line,
    );
  }
  if (lines.length >= ORDER_ITEMS_MAX) return lines;

  return [...lines, { productId, qty: clampQty(qty) }];
}

/** Поставити кількість позиції; `0` і менше — прибирає її (`cartRemove`). */
export function cartSetQty(lines: CartLine[], productId: number, qty: number): CartLine[] {
  if (Math.floor(Number(qty)) < 1) return cartRemove(lines, productId);

  return lines.map((line) =>
    line.productId === productId ? { ...line, qty: clampQty(qty) } : line,
  );
}

export function cartRemove(lines: CartLine[], productId: number): CartLine[] {
  return lines.filter((line) => line.productId !== productId);
}

/** Скільки всього одиниць у кошику — число на кнопці, а не кількість позицій. */
export function cartCount(lines: readonly CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0);
}

/**
 * Чи потрібна доставка хоч чомусь у кошику.
 *
 * Питаємо за **кошиком**, а не за одним товаром (те саме правило, що в
 * `orderNeedsShipping`): змішане замовлення мусить дістати адресу, бо фізичній
 * частині її нікуди подіти. Виду, якого більше немає в магазині, тут немає —
 * його не було в кошику.
 */
export function cartNeedsShipping(
  lines: readonly CartLine[],
  products: readonly ShopProduct[],
): boolean {
  const kinds = cartProducts(lines, products).map((product) => product.kind);
  return orderNeedsShipping(kinds);
}

/**
 * Товари кошика в порядку, у якому їх набрали.
 *
 * Товар, якого більше немає в магазині, **пропускається**: показати його ціну
 * нема звідки, а замовлення з ним однаково відхилить сервер. Саме тому
 * `cartLines` рахує позиції вже з того, що лишилось, — і покупець бачить
 * кошик, з якого зникле прибрано, а не суму з привидом.
 */
export function cartProducts(
  lines: readonly CartLine[],
  products: readonly ShopProduct[],
): ShopProduct[] {
  const byId = new Map(products.map((product) => [product.id, product]));
  return lines
    .map((line) => byId.get(line.productId))
    .filter((product): product is ShopProduct => product !== undefined);
}

/** Позиції для замовлення — те, що надсилають на сервер (`OrderItemInput`). */
export function cartLines(
  lines: readonly CartLine[],
  products: readonly ShopProduct[],
): OrderItemInput[] {
  const available = new Set(products.map((product) => product.id));
  return lines
    .filter((line) => available.has(line.productId))
    .map((line) => ({ productId: line.productId, qty: line.qty }));
}

/**
 * Число з ціни-тексту; `null` — у ній числа немає.
 *
 * Ціна в магазині — текст («2 000 ₴», «від 300 грн», «договірна»), і **це не
 * помилка даних**, а спосіб продавати. Тому беремо перше число, яке є, а
 * «договірна» чесно лишається без числа: вигадати нуль означало б показати
 * покупцеві безкоштовне замовлення.
 */
export function parsePriceAmount(price: string): number | null {
  const match = /(\d[\d\s\u00a0]*(?:[.,]\d+)?)/u.exec(price);
  if (!match) return null;

  const value = Number(match[1].replace(/[\s\u00a0]/gu, "").replace(",", "."));
  return Number.isFinite(value) ? value : null;
}

/** Що показувати замість суми, коли частина цін — домовленість. */
export interface CartTotal {
  /** Сума відомих цін; `null` — жодної відомої (самі домовленості). */
  amount: number | null;
  /** Хоч одна позиція має ціну без числа — сума неповна, і це видно словом. */
  hasUnknown: boolean;
  /** Скільки одиниць у кошику — разом із тими, чиєї ціни не знаємо. */
  count: number;
}

/**
 * Разом по кошику: сума **того, що можна порахувати**, і позначка неповноти.
 *
 * Це не «сума замовлення»: замовлення не має суми взагалі, бо ціну називає
 * продавець. Тут лише довідка для покупця, і вона мусить бути чесною — саме
 * тому `hasUnknown` окремим полем, а не нуль у сумі.
 */
export function cartTotal(lines: readonly CartLine[], products: readonly ShopProduct[]): CartTotal {
  const byId = new Map(products.map((product) => [product.id, product]));
  let amount = 0;
  let known = false;
  let hasUnknown = false;
  let count = 0;

  for (const line of lines) {
    // Товар, якого більше немає, у суму не входить — як і в кошику на екрані.
    const product = byId.get(line.productId);
    if (!product) continue;

    count += line.qty;
    const price = parsePriceAmount(product.price);
    if (price === null) {
      hasUnknown = true;
      continue;
    }
    known = true;
    amount += price * line.qty;
  }

  return { amount: known ? amount : null, hasUnknown, count };
}
