/**
 * Кошик покупця — стан вітрини, який переживає перезавантаження сторінки.
 *
 * **Кошик живе у сховищі браузера, а не на сервері.** Замовлення ще немає, а
 * «кошик, який нікуди не дінеться» — це вже обіцянка продавцю, якої ніхто не
 * давав: покупцеві досить того, що набране не зникає після закриття
 * Mini App. Тому сховище — це **підказка**, і читається воно так само
 * обережно, як чужий ввід: зіпсований запис не ламає вітрину, а просто не має
 * кошика.
 *
 * **Кошики різних магазинів — різні.** Ключ містить адресу магазину: у
 * покупця, який ходить до двох кав'ярень, один кошик не мусить перетворюватись
 * на другий.
 *
 * @module web-platform-dev/src/pages/shop/store
 */

import { useCallback, useEffect, useState } from "react";
import { cartAdd, cartCount, cartRemove, cartSetQty, type CartLine } from "@wwwuabot/shared/shop";

/** Ключ сховища для цього магазину; адреса магазину — його частина. */
export function cartStorageKey(shopSlug: string): string {
  return `wwwuabot.shop.cart.${shopSlug}`;
}

/**
 * Кошик із запису сховища: усе, чого не зрозуміти, **відкидається**.
 *
 * Дужки, чужі ключі, нулі, дробові номери — усе це могло потрапити в сховище
 * (стара версія продукту, інша вкладка, людина з відкритою консоллю). Показати
 * таке в кошику означало б запропонувати купити товар без номера.
 */
export function readCart(raw: string | null): CartLine[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];

  let lines: CartLine[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) continue;
    const source = entry as Record<string, unknown>;
    const productId = Number(source.productId);
    const qty = Number(source.qty);
    if (!Number.isInteger(productId) || productId <= 0) continue;
    // Повтор номера **складається**, а не лишає останню кількість: правило те
    // саме, що в `cartAdd` — інакше зіпсований запис тихо зменшив би кошик.
    lines = cartAdd(lines, productId, Number.isFinite(qty) ? qty : 1);
  }
  return lines;
}

export interface ShopCartState {
  lines: CartLine[];
  /** Скільки одиниць усього — число на кнопці. */
  count: number;
  add: (productId: number, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  /** Порожній кошик — після замовлення та в кожному разі, коли він більше не потрібен. */
  clear: () => void;
}

/** Кошик разом із магазином, з якого він прийшов. */
interface StoredCart {
  slug: string;
  lines: CartLine[];
}

/** Читання сховища, яке ніколи не кидає: недоступне сховище — порожній кошик. */
function readStored(shopSlug: string): CartLine[] {
  try {
    return readCart(window.localStorage.getItem(cartStorageKey(shopSlug)));
  } catch {
    return [];
  }
}

export function useShopCart(shopSlug: string): ShopCartState {
  // Сховище читається **один раз і в початковому стані**: воно не сервер і не
  // змінюється поза цією вкладкою, тож ефект «прочитати після першого кадру»
  // лише показав би порожній кошик на один кадр.
  const [stored, setStored] = useState<StoredCart>(() => ({
    slug: shopSlug,
    lines: readStored(shopSlug),
  }));

  // Змінили магазин — кошик **інший**: у нього свій запис, і брати його треба
  // звідти ж, звідки перший.
  const lines = stored.slug === shopSlug ? stored.lines : readStored(shopSlug);

  // Запис — ефект: сховище це зовнішня система, і писати в неї під час
  // рендера не можна. Сам стан при цьому змінюється лише дією покупця.
  useEffect(() => {
    try {
      window.localStorage.setItem(cartStorageKey(stored.slug), JSON.stringify(stored.lines));
    } catch {
      // Записати не вдалось — це не привід ламати кошик на екрані.
    }
  }, [stored]);

  const apply = useCallback(
    (change: (lines: CartLine[]) => CartLine[]) =>
      setStored({ slug: shopSlug, lines: change(lines) }),
    [shopSlug, lines],
  );

  const add = useCallback(
    (productId: number, qty = 1) => apply((prev) => cartAdd(prev, productId, qty)),
    [apply],
  );

  const setQty = useCallback(
    (productId: number, qty: number) => apply((prev) => cartSetQty(prev, productId, qty)),
    [apply],
  );

  const remove = useCallback(
    (productId: number) => apply((prev) => cartRemove(prev, productId)),
    [apply],
  );

  const clear = useCallback(() => apply(() => []), [apply]);

  return { lines, count: cartCount(lines), add, setQty, remove, clear };
}
