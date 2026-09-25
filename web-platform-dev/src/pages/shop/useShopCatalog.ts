/**
 * Каталог магазину для покупця — те, що видно під вітриною.
 *
 * Джерело — `GET /api/space/shop/products?shop=<адреса>`: публічне, бо вітрину
 * відкривають **без** входу, а чернетки й закритий магазин відсікає запит до
 * бази (`is_active = 1`, `COALESCE(is_public, 0) = 1`), а не клієнт.
 *
 * **Невдача = «каталогу немає», а не помилка на сторінці.** Сторінка під
 * каталогом існує й без нього: у не-магазину товарів не буде ніколи, а мережевий
 * збій не має права ламати вітрину, яку вже показано. Тому тут немає ані стану
 * помилки, ані повторної спроби — порожній список і є відповідь.
 *
 * **Дані тримають адресу, з якої прийшли.** Перейшли на інший магазин — старі
 * товари не показуються, доки не прийдуть нові: `loading` виводиться з цього
 * збігу, а не виставляється ефектом.
 *
 * @module web-platform-dev/src/pages/shop
 */

import { useEffect, useState } from "react";
import type { ShopMedia, ShopProduct } from "@wwwuabot/shared/shop";
import { shopApi } from "@/shared/api/shop.api";

/** Товари разом із адресою магазину, з якої вони прийшли. */
interface CatalogData {
  slug: string;
  products: ShopProduct[];
  media: ShopMedia[];
}

export interface ShopCatalogState {
  products: ShopProduct[];
  media: ShopMedia[];
  loading: boolean;
}

/**
 * Каталог за адресою магазину; `null` — адреси немає, тож і питати нічого.
 *
 * Без цієї межі сторінка, яка не є магазином, питала б каталог за своєю
 * адресою щоразу: відповідь «немає такого магазину» нічого не додає до того,
 * що вже видно з `template_key`.
 */
export function useShopCatalog(shopSlug: string | null): ShopCatalogState {
  const [data, setData] = useState<CatalogData | null>(null);
  const [settled, setSettled] = useState<string | null>(null);

  const current = data && data.slug === shopSlug ? data : null;
  const loading = shopSlug !== null && settled !== shopSlug;

  useEffect(() => {
    if (shopSlug === null) return;

    let cancelled = false;

    shopApi
      .catalog(shopSlug)
      .then((next) => {
        if (cancelled) return;
        setData({ slug: shopSlug, products: next.products, media: next.media });
      })
      .catch(() => {
        if (cancelled) return;
        setData({ slug: shopSlug, products: [], media: [] });
      })
      .finally(() => {
        if (!cancelled) setSettled(shopSlug);
      });

    return () => {
      cancelled = true;
    };
  }, [shopSlug]);

  return {
    products: current?.products ?? [],
    media: current?.media ?? [],
    loading,
  };
}
