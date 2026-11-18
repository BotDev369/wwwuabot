/**
 * Вхід у товари й замовлення магазину — на самій сторінці сценарію.
 *
 * **Чому картка стоїть у вітрині.** Товари лежать не в `page_data`, а в окремій
 * таблиці (`shop_products`, `docs/SHOPS.md` §3), тож сторінка, яка їх не
 * згадує, виглядає як звичайний текст: власник бачив би вітрину й не мав
 * **нізвідки** дізнатись, що в магазину є товари. Дотик по сторінці нічого не
 * відкриває — це сторінка, а не кнопка, і саме тому вхід мусить стояти окремо.
 *
 * **Картку бачить лише той, хто веде цей магазин.** Список
 * (`useManagedScenarios`) віддає рядки під підписаним `initData`, тож покупцеві
 * тут не показується нічого — і жодного зайвого запиту на не-магазині немає:
 * компонент монтується лише у вітрині.
 *
 * @module web-platform-dev/src/pages/shop
 */

import type { ReactElement } from "react";
import { useManagedScenarios } from "@/pages/scenarios/useManagedScenarios";
import { ShopPanel } from "./ShopPanel";

export function ShopOwnerPanel({
  scenarioId,
  loading,
  count,
  error,
}: {
  scenarioId: number | null;
  loading: boolean;
  count: number;
  error: string | null;
}): ReactElement | null {
  const { pages } = useManagedScenarios();
  if (scenarioId === null) return null;

  const managed = pages.some((page) => page.id === scenarioId && page.template === "shop");
  if (!managed) return null;

  return <ShopPanel pageId={scenarioId} loading={loading} count={count} error={error} />;
}
