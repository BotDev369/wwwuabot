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
 * **Статус і правка — дві функції, і це не повтор.** Статус міняють кнопкою у
 * списку й там само у замовленні, тож він приходить **одним полем** і окремим
 * шляхом; правка несе усе замовлення й повертає його **цілком** — з нього екран
 * бере нові позиції, контакт і коментар, і перебирати їх локально означало б
 * друге правило того самого знімка.
 *
 * @module web-platform-dev/src/pages/shop
 */

import { useCallback, useEffect, useState } from "react";
import type { OrderEditDraft, OrderStatus, ShopOrder } from "@wwwuabot/shared/shop";
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
  /** Зберегти правку (позиції, контакт, коментар) і повернути збережене. */
  save: (orderId: number, draft: OrderEditDraft) => Promise<ShopOrder>;
  /** Прибрати замовлення зі своєї черги. */
  remove: (orderId: number) => Promise<void>;
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

  const save = useCallback(
    async (orderId: number, draft: OrderEditDraft): Promise<ShopOrder> => {
      if (shopId === null) throw new Error("Магазин не обрано");

      const saved = await shopApi.saveOrder(shopId, orderId, draft);
      setData((prev) =>
        prev && prev.shopId === shopId
          ? {
              ...prev,
              orders: prev.orders.map((order) => (order.id === orderId ? saved : order)),
            }
          : prev,
      );
      return saved;
    },
    [shopId],
  );

  const remove = useCallback(
    async (orderId: number): Promise<void> => {
      if (shopId === null) return;

      await shopApi.removeOrder(shopId, orderId);
      // Прибране замовлення не лишається в черзі навіть до перезапиту: воно
      // зникає саме там, де його щойно бачили.
      setData((prev) =>
        prev && prev.shopId === shopId
          ? { ...prev, orders: prev.orders.filter((order) => order.id !== orderId) }
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
    save,
    remove,
  };
}
