/**
 * Кошик покупця — серверний стан із локальним кешем. D1 — джерело істини, бо
 * той самий кошик бачить бот; `localStorage` дає перший кадр і офлайн, а старий
 * локальний кошик зливається із серверним один раз (позначка в сховищі).
 *
 * @module web-platform-dev/src/pages/shop/store
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { cartAdd, cartCount, cartRemove, cartSetQty, type CartLine } from "@wwwuabot/shared/shop";
import { shopApi } from "@/shared/api/shop.api";

/** Ключ сховища для цього магазину; адреса магазину — його частина. */
export function cartStorageKey(shopSlug: string): string {
  return `wwwuabot.shop.cart.${shopSlug}`;
}

/** Позначка, що старий локальний кошик уже злито із серверним. */
function cartSyncedKey(shopSlug: string): string {
  return `${cartStorageKey(shopSlug)}.synced`;
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

function markSynced(shopSlug: string): void {
  try {
    window.localStorage.setItem(cartSyncedKey(shopSlug), "1");
  } catch {
    // Позначку не записати — не привід ламати кошик; злиття повториться.
  }
}

function alreadySynced(shopSlug: string): boolean {
  try {
    return window.localStorage.getItem(cartSyncedKey(shopSlug)) === "1";
  } catch {
    return false;
  }
}

/** Локальне додати до серверного один раз; помилка позиції її просто пропускає. */
async function mergeLegacy(shopSlug: string, server: CartLine[]): Promise<CartLine[]> {
  if (alreadySynced(shopSlug)) return server;

  let lines = server;
  for (const line of readStored(shopSlug)) {
    try {
      lines = await shopApi.addCartLine(shopSlug, line.productId, line.qty);
    } catch {
      // Товар зник або мережа урвалась — решта кошика важливіша.
    }
  }
  markSynced(shopSlug);
  return lines;
}

export function useShopCart(shopSlug: string): ShopCartState {
  const [stored, setStored] = useState<StoredCart>(() => ({
    slug: shopSlug,
    lines: readStored(shopSlug),
  }));

  // Змінили магазин — показуємо його кеш, поки сервер не відповів.
  const lines = stored.slug === shopSlug ? stored.lines : readStored(shopSlug);

  // Запис кешу — ефект: сховище це зовнішня система, і писати в неї під час
  // рендера не можна. Сам стан змінюється лише дією покупця або сервером.
  useEffect(() => {
    try {
      window.localStorage.setItem(cartStorageKey(stored.slug), JSON.stringify(stored.lines));
    } catch {
      // Записати не вдалось — це не привід ламати кошик на екрані.
    }
  }, [stored]);

  // Серверна відповідь замінює кеш; збій мережі лишає кеш, а не порожній кошик.
  // Скільки змін зробив покупець: відповідь сервера не має затерти свіжий тап.
  const mutations = useRef(0);
  useEffect(() => {
    let cancelled = false;
    const before = mutations.current;
    void (async () => {
      try {
        const server = await shopApi.cart(shopSlug);
        const merged = await mergeLegacy(shopSlug, server);
        if (!cancelled && mutations.current === before) {
          setStored({ slug: shopSlug, lines: merged });
        }
      } catch {
        // Офлайн або сервер недоступний — кошик із кешу лишається робочим.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shopSlug]);

  // Запити йдуть один за одним: інакше відповідь на перший тап могла б
  // прийти після другого й повернути старішу кількість.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const push = useCallback(
    (request: () => Promise<CartLine[]>) => {
      queue.current = queue.current
        .then(request)
        .then((next) =>
          setStored((prev) => (prev.slug === shopSlug ? { slug: shopSlug, lines: next } : prev)),
        )
        .catch(() => {
          // Сервер відмовив — наступне читання покаже справжній стан.
        });
    },
    [shopSlug],
  );

  const apply = useCallback(
    (change: (prev: CartLine[]) => CartLine[]) =>
      setStored({ slug: shopSlug, lines: change(lines) }),
    [shopSlug, lines],
  );

  const add = useCallback(
    (productId: number, qty = 1) => {
      mutations.current += 1;
      apply((prev) => cartAdd(prev, productId, qty));
      push(() => shopApi.addCartLine(shopSlug, productId, qty));
    },
    [apply, push, shopSlug],
  );

  const setQty = useCallback(
    (productId: number, qty: number) => {
      mutations.current += 1;
      apply((prev) => cartSetQty(prev, productId, qty));
      push(() => shopApi.setCartLine(shopSlug, productId, qty));
    },
    [apply, push, shopSlug],
  );

  const remove = useCallback(
    (productId: number) => {
      mutations.current += 1;
      apply((prev) => cartRemove(prev, productId));
      push(() => shopApi.removeCartLine(shopSlug, productId));
    },
    [apply, push, shopSlug],
  );

  const clear = useCallback(() => {
    mutations.current += 1;
    apply(() => []);
    push(() => shopApi.clearCart(shopSlug));
  }, [apply, push, shopSlug]);

  return { lines, count: cartCount(lines), add, setQty, remove, clear };
}
