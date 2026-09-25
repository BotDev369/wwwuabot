/**
 * Клієнт магазину — форма запиту, спільна для оболонок.
 *
 * **Два шляхи, і різниця між ними принципова:** власні товари читаються з-під
 * підписаного `initData` (разом із чернетками), а каталог — публічний, за
 * адресою магазину. Тримати це в одній функції означало б «залежить від того,
 * хто кличе», тобто правило, яке легко забути — а помилка тут показала б
 * чернетки покупцеві.
 *
 * **Товари їдуть разом із рядками файлів.** Галерея товару тримає **номери**
 * `shop_media`, а не адреси (`docs/SHOPS.md` §5), тож адресу з них будує той,
 * хто показує: одна відповідь на список, а не запит на кожне фото.
 *
 * **Транспорт передається аргументом** і їх два: звичайний (JSON) і
 * завантаження. Завантаження мусить іти **повз** JSON-транспорт, бо multipart
 * сам ставить `Content-Type` із межею — заголовок `application/json` зіпсував
 * би його, і сервер не розібрав би форми.
 *
 * @module @wwwuabot/shared/shop
 */

import type {
  CatalogResponse,
  MediaDeleteResponse,
  MediaListResponse,
  MediaSaveResponse,
  ProductDeleteResponse,
  ProductDraft,
  ProductListResponse,
  ProductSaveResponse,
  ShopMedia,
  ShopProduct,
} from "./types";

/** Мінімум, який потрібен від JSON-транспорту оболонки. */
export interface ShopTransport {
  <T>(path: string, init?: RequestInit): Promise<T>;
}

/** Транспорт завантаження файлу: сама форма, без JSON-заголовка. */
export interface ShopUploadTransport {
  <T>(path: string, form: FormData): Promise<T>;
}

/** Товари разом із файлами, на які вони посилаються. */
export interface ShopProducts {
  products: ShopProduct[];
  media: ShopMedia[];
}

export interface ShopApi {
  /** Власні товари — разом із чернетками: їх треба бачити саме продавцю. */
  products: (shopId: number) => Promise<ShopProducts>;
  /** Зберегти: без `id` — новий, з `id` — правка свого. */
  saveProduct: (shopId: number, draft: ProductDraft) => Promise<ShopProduct | null>;
  /** Прибрати свій товар. Чужого номера тут бути не може: власника додає сервер. */
  removeProduct: (shopId: number, id: number) => Promise<void>;
  /** Каталог відкритого магазину за його адресою. */
  catalog: (shopSlug: string) => Promise<ShopProducts>;
  /** Власна бібліотека файлів — щоб одне фото можна було поставити двом товарам. */
  media: (shopId: number) => Promise<ShopMedia[]>;
  /** Завантажити фото: файл спершу стає рядком, потім його приєднує товар. */
  upload: (shopId: number, file: File) => Promise<ShopMedia>;
  /** Прибрати файл; товар, який на нього посилався, лишається. */
  removeMedia: (shopId: number, id: number) => Promise<void>;
}

/** Шляхи трьох поверхонь: свої товари, власні файли й публічний каталог. */
export interface ShopApiPaths {
  products: string;
  media: string;
  catalog: string;
}

/** Шлях із параметрами: `?shop=…&limit=…`. */
function withQuery(path: string, params: Record<string, string | number>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) search.set(key, String(value));
  return `${path}?${search.toString()}`;
}

export function createShopApi(
  fetchJson: ShopTransport,
  uploadForm: ShopUploadTransport,
  paths: ShopApiPaths,
): ShopApi {
  const read = (body: ProductListResponse | CatalogResponse): ShopProducts => ({
    products: body.products ?? [],
    media: body.media ?? [],
  });

  return {
    products: async (shopId) =>
      read(await fetchJson<ProductListResponse>(withQuery(paths.products, { shop: shopId }))),

    catalog: async (shopSlug) =>
      read(await fetchJson<CatalogResponse>(withQuery(paths.catalog, { shop: shopSlug }))),

    saveProduct: async (shopId, draft) =>
      (
        await fetchJson<ProductSaveResponse>(paths.products, {
          method: "POST",
          body: JSON.stringify({ ...draft, shop: shopId }),
        })
      ).product ?? null,

    removeProduct: async (shopId, id) => {
      const response = await fetchJson<ProductDeleteResponse>(
        withQuery(paths.products, { shop: shopId, id }),
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(response.error ?? "Не вдалося прибрати товар");
    },

    media: async (shopId) =>
      (await fetchJson<MediaListResponse>(withQuery(paths.media, { shop: shopId }))).media ?? [],

    upload: async (shopId, file) => {
      const form = new FormData();
      form.set("shop", String(shopId));
      form.set("file", file);
      const response = await uploadForm<MediaSaveResponse>(paths.media, form);
      if (!response.ok || !response.media) {
        throw new Error(response.error ?? "Не вдалося завантажити файл");
      }
      return response.media;
    },

    removeMedia: async (shopId, id) => {
      const response = await fetchJson<MediaDeleteResponse>(
        withQuery(paths.media, { shop: shopId, id }),
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error(response.error ?? "Не вдалося прибрати файл");
    },
  };
}
