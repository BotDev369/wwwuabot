/**
 * Замовлення свого магазину — дані для екрана продавця.
 *
 * Джерело — `GET /api/user/shop/orders`, і ідентичність там беруть із
 * підписаного `initData`: клієнт не передає жодного `user_id` і не може
 * попросити чужі замовлення. Номер магазину приходить із адреси
 * (`/pages/:id/orders`) — він і є `scenarios.id` цієї сторінки.
 *
 * **Статуси читаються разом із замовленнями, і це не «ще один запит».** У рядку
 * замовлення стоїть **ключ**, а підпис магазин переписує під свій процес
 * (§7) — тож без списку статусів екран показав би або ключі, або власні
 * вигадки замість слова магазину.
 *
 * **Оновлення — локальні, як і в товарів.** Сервер повертає змінений рядок, тож
 * другий похід по весь список показав би «завантаження» там, де нічого не
 * завантажується.
 *
 * @module web-platform-dev/src/pages/shop
 */

import { useCallback, useEffect, useState } from "react";
import type { OrderStatus, ShopOrder } from "@wwwuabot/shared/shop";
import { shopApi } from "@/shared/api/shop.api";

/** Дані разом із магазином, з якого вони прийшли. */
interface OrdersData {
  shopId: number;
  orders: ShopOrder[];
  statuses: OrderStatus[];
}

export interface ShopOrdersState {
  orders: ShopOrder[];
  statuses: OrderStatus[];
  loading: boolean;
  error: string | null;
  /** Поставити статус; кидає — помилку показує екран, а не хук. */
  setStatus: (orderId: number, status: string) => Promise<void>;
}

export function useShopOrders(shopId: number | null): ShopOrdersState {
  const [data, setData] = useState<OrdersData | null>(null);
  const [settled, setSettled] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = data && data.shopId === shopId ? data : null;
  const loading = shopId !== null && settled !== shopId;

  useEffect(() => {
    if (shopId === null) return;

    let cancelled = false;

    Promise.all([shopApi.orders(shopId), shopApi.statuses(shopId)])
      .then(([orders, statuses]) => {
        if (cancelled) return;
        setData({ shopId, orders, statuses });
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Не вдалося завантажити замовлення");
      })
      .finally(() => {
        if (!cancelled) setSettled(shopId);
      });

    return () => {
      cancelled = true;
    };
  }, [shopId]);

  const setStatus = useCallback(
    async (orderId: number, status: string): Promise<void> => {
      if (shopId === null) return;
      await shopApi.setOrderStatus(shopId, orderId, status);
      // У списку міняється **ключ**, і лише він: підпис береться зі списку
      // статусів, який уже приїхав, — другого перекладу тут не зʼявляється.
      setData((prev) =>
        prev && prev.shopId === shopId
          ? {
              ...prev,
              orders: prev.orders.map((order) =>
                order.id === orderId ? { ...order, status } : order,
              ),
            }
          : prev,
      );
    },
    [shopId],
  );

  return {
    orders: current?.orders ?? [],
    statuses: current?.statuses ?? [],
    loading,
    error,
    setStatus,
  };
}
