/**
 * Вхід у вітрину з бота: товар за посиланням і швидке замовлення.
 *
 * Адреса `?add=1` / `?order=1` читається один раз: повторний рендер не мусить
 * додавати товар удруге. Кошик приходить готовим із `useShopCart`.
 *
 * @module web-platform-dev/src/pages/shop/store
 */

import { useEffect, useRef, useState } from "react";
import type { CartLine, ShopProduct } from "@wwwuabot/shared/shop";
import type { ShopCartState } from "./useShopCart";

interface StoreEntryArgs {
  products: ShopProduct[];
  routeProductSlug: string | null;
  intent: "add" | "order" | null;
  cart: ShopCartState;
  onOpenProduct: (id: number) => void;
  onOpenCart: () => void;
}

export interface StoreEntry {
  /** Позиції для підтвердження швидкого замовлення; `null` — поверхня закрита. */
  quickLines: CartLine[] | null;
  openQuick: (lines: CartLine[]) => void;
  closeQuick: () => void;
}

export function useStoreEntry({
  products,
  routeProductSlug,
  intent,
  cart,
  onOpenProduct,
  onOpenCart,
}: StoreEntryArgs): StoreEntry {
  const [quickLines, setQuickLines] = useState<CartLine[] | null>(null);
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !routeProductSlug || products.length === 0) return;
    const target = products.find((item) => item.slug === routeProductSlug);
    if (!target) return;

    handled.current = true;
    if (intent === "order") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- вхід з адреси: стан задається один раз, коли товари вже прийшли
      setQuickLines([{ productId: target.id, qty: 1 }]);
      return;
    }
    if (intent === "add") {
      cart.add(target.id, 1);
      onOpenCart();
      return;
    }
    onOpenProduct(target.id);
  }, [routeProductSlug, intent, products, cart, onOpenProduct, onOpenCart]);

  return {
    quickLines,
    openQuick: setQuickLines,
    closeQuick: () => setQuickLines(null),
  };
}
