/**
 * Товари свого магазину — дані для списку, форми й перемикачів.
 *
 * Джерело — `GET /api/user/shop/products`: ідентичність там беруть із підписаного
 * `initData`, тож клієнт не передає жодного `user_id` і не може попросити чужі
 * товари. Номер магазину приходить із адреси (`/pages/:id/...`) — він і є
 * `scenarios.id` цієї сторінки.
 *
 * **Один хук на всі екрани продавця.** Список, форма й перемикачі читають те
 * саме джерело: другий запит «дай один товар» віддавав би той самий рядок із
 * тим самим фільтром, а розійтися вони могли б лише в одному — у видимості,
 * тобто саме там, де помилка найдорожча (той самий прийом, що в сторінок).
 *
 * **Оновлення — локальні, а не повторним запитом.** Сервер уже повернув
 * збережений товар і потрібні йому файли, тож другий похід по весь список
 * показав би «завантаження» там, де нічого не завантажується.
 *
 * **Стан зберігається разом із номером магазину.** Це не надмірність: `loading`
 * виводиться з того, чиї дані вже прийшли (`data.shopId === shopId`), а не
 * виставляється ефектом. Інакше перший кадр нового магазину показував би чужі
 * товари — або порожній список замість «завантаження».
 *
 * @module web-platform-dev/src/pages/shop
 */

import { useCallback, useEffect, useState } from "react";
import type { ProductDraft, ShopMedia, ShopProduct } from "@wwwuabot/shared/shop";
import { shopApi } from "@/shared/api/shop.api";

/** Дані разом із магазином, з якого вони прийшли. */
interface ShopData {
  shopId: number;
  products: ShopProduct[];
  media: ShopMedia[];
}

export interface ShopProductsState {
  products: ShopProduct[];
  media: ShopMedia[];
  loading: boolean;
  error: string | null;
  /** Зберегти: без `id` — новий, з `id` — правка. */
  save: (draft: ProductDraft) => Promise<ShopProduct | null>;
  /** Прибрати товар зі списку після видалення. */
  remove: (id: number) => void;
  /** Завантажити фото: рядок обліку повертає сервер, і він же — джерело правди. */
  upload: (file: File) => Promise<ShopMedia>;
  /** Прибрати файл зі списку після видалення (товари лишаються як є). */
  dropMedia: (id: number) => void;
}

export function useShopProducts(shopId: number | null): ShopProductsState {
  const [data, setData] = useState<ShopData | null>(null);
  const [settled, setSettled] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const current = data && data.shopId === shopId ? data : null;
  const loading = shopId !== null && settled !== shopId;

  useEffect(() => {
    if (shopId === null) return;

    // `cancelled` — не формальність: екран закривають раніше, ніж прийде
    // відповідь, і без цієї перевірки стан оновлювався б у вже знятому дереві.
    let cancelled = false;

    shopApi
      .products(shopId)
      .then((next) => {
        if (cancelled) return;
        setData({ shopId, products: next.products, media: next.media });
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Не вдалося завантажити товари");
      })
      .finally(() => {
        if (!cancelled) setSettled(shopId);
      });

    return () => {
      cancelled = true;
    };
  }, [shopId]);

  /** Зміна вже прийнятих даних: джерело правди лишається те саме. */
  const update = useCallback((change: (prev: ShopData) => ShopData) => {
    setData((prev) => (prev ? change(prev) : prev));
  }, []);

  const save = useCallback(
    async (draft: ProductDraft): Promise<ShopProduct | null> => {
      if (shopId === null) return null;
      const saved = await shopApi.saveProduct(shopId, draft);
      if (saved) {
        update((prev) => ({
          ...prev,
          products: prev.products.some((item) => item.id === saved.id)
            ? prev.products.map((item) => (item.id === saved.id ? saved : item))
            : [saved, ...prev.products],
        }));
      }
      return saved;
    },
    [shopId, update],
  );

  const upload = useCallback(
    async (file: File): Promise<ShopMedia> => {
      if (shopId === null) throw new Error("Магазин не визначено");
      const stored = await shopApi.upload(shopId, file);
      update((prev) =>
        // Той самий рядок не має стояти двічі: номер файлу — ідентичність.
        prev.media.some((item) => item.id === stored.id)
          ? prev
          : { ...prev, media: [...prev.media, stored] },
      );
      return stored;
    },
    [shopId, update],
  );

  const remove = useCallback(
    (id: number) => {
      update((prev) => ({ ...prev, products: prev.products.filter((item) => item.id !== id) }));
    },
    [update],
  );

  const dropMedia = useCallback(
    (id: number) => {
      update((prev) => ({ ...prev, media: prev.media.filter((item) => item.id !== id) }));
    },
    [update],
  );

  return {
    products: current?.products ?? [],
    media: current?.media ?? [],
    loading,
    error,
    save,
    remove,
    upload,
    dropMedia,
  };
}
