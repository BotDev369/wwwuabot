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
 * **Замовлення має той самий поділ, і навіть різкіший.** Замовити можна в
 * **відкритому** магазині за адресою — від покупця потрібна лише ідентичність із
 * підписаного `initData`; а от **читати** замовлення можна лише з продавського
 * боку свого магазину. Покупцеві про його замовлення каже розмова, яку воно ж і
 * відкрило (`docs/SHOPS.md` §8).
 *
 * **Транспорт передається аргументом** і їх два: звичайний (JSON) і
 * завантаження. Завантаження мусить іти **повз** JSON-транспорт, бо multipart
 * сам ставить `Content-Type` із межею — заголовок `application/json` зіпсував
 * би його, і сервер не розібрав би форми.
 *
 * @module @wwwuabot/shared/shop
 */

import type { OrderDraftInput } from "./orders";
import type { OrderStatus } from "./statuses";
import type {
  CatalogResponse,
  MediaDeleteResponse,
  MediaListResponse,
  MediaSaveResponse,
  OrderListResponse,
  OrderSaveResponse,
  ProductDeleteResponse,
  ProductDraft,
  ProductListResponse,
  ProductSaveResponse,
  ShopMedia,
  ShopOrder,
  ShopProduct,
  StatusListResponse,
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
  /** Замовлення свого магазину — те, що бачить продавець. */
  orders: (shopId: number) => Promise<ShopOrder[]>;
  /** Замовити у **відкритому** магазині за його адресою. */
  placeOrder: (shopSlug: string, draft: OrderDraftInput) => Promise<ShopOrder>;
  /** Поставити статус замовленню свого магазину. */
  setOrderStatus: (shopId: number, orderId: number, status: string) => Promise<void>;
  /** Статуси магазину: типові з його правками — те, з чого вибирає екран. */
  statuses: (shopId: number) => Promise<OrderStatus[]>;
}

/** Шляхи поверхонь: свої товари, файли, каталог і замовлення. */
export interface ShopApiPaths {
  products: string;
  media: string;
  catalog: string;
  orders: string;
  /** Зміна статусу — окремий шлях: список і дія не плутаються навіть адресою. */
  orderStatus: string;
  placeOrder: string;
  statuses: string;
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

    // Номер магазину їде **в адресі**, як і в решті шляхів товарів: він називає
    // магазин, а не товар, тож у тілі він був би полем чернетки — і контролер
    // читав би його звідти, де його немає. Тіло — рівно те, що зберігаємо.
    saveProduct: async (shopId, draft) =>
      (
        await fetchJson<ProductSaveResponse>(withQuery(paths.products, { shop: shopId }), {
          method: "POST",
          body: JSON.stringify(draft),
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

    orders: async (shopId) =>
      (await fetchJson<OrderListResponse>(withQuery(paths.orders, { shop: shopId }))).orders ?? [],

    placeOrder: async (shopSlug, draft) => {
      const response = await fetchJson<OrderSaveResponse>(
        withQuery(paths.placeOrder, { shop: shopSlug }),
        { method: "POST", body: JSON.stringify(draft) },
      );
      if (!response.ok || !response.order) {
        throw new Error(response.error ?? "Не вдалося надіслати замовлення");
      }
      return response.order;
    },

    setOrderStatus: async (shopId, orderId, status) => {
      const response = await fetchJson<OrderSaveResponse>(paths.orderStatus, {
        method: "POST",
        body: JSON.stringify({ shop: shopId, id: orderId, status }),
      });
      if (!response.ok) throw new Error(response.error ?? "Не вдалося змінити статус");
    },

    statuses: async (shopId) =>
      (await fetchJson<StatusListResponse>(withQuery(paths.statuses, { shop: shopId }))).statuses ??
      [],
  };
}
