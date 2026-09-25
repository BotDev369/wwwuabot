/**
 * @wwwuabot/shared/shop — магазин: вітрина, товари, замовлення.
 *
 * Один домен на клієнт і сервер:
 *
 * - `kinds.ts` — **види товару** (`PRODUCT_KINDS`: фізичний, цифровий,
 *   послуга) із тим, що вид означає для потоку замовлення (доставка, файл):
 *   перелік закритий, бо вид — це поведінка, а не слово;
 * - `statuses.ts` — **статуси замовлення**: типові в коді
 *   (`DEFAULT_ORDER_STATUSES`), а магазин тримає лише відхилення —
 *   перейменування, вимкнення й власні (`resolveOrderStatuses`);
 * - `products.ts` — **правила товару**: адреса в межах магазину,
 *   характеристики, номери фото й перевірка чернетки (`validateProductDraft`);
 * - `orders.ts` — **правила замовлення**: що питати в покупця залежно від виду
 *   товару (`orderContactFields`), кошик і перевірка (`validateOrderDraft`);
 * - `media.ts` — **файли магазину**: ключ R2, межі, адреса з ключа й перевірка
 *   завантаження (`validateMediaUpload`);
 * - `api.ts` — **клієнт** магазину: форма запиту, спільна для обох оболонок;
 * - `types.ts` — товар, файл, замовлення й знімок позиції.
 *
 * **Магазин — це рядок `scenarios`**, а не окрема таблиця: `id` — номер
 * магазину (на нього дивляться товари й замовлення), `slug` — адреса,
 * `owner_id` — продавець, `is_public` — видимість, `page_data` — вітрина.
 * Товар і замовлення — окремі рядки (`shop_products`, `shop_orders`), бо їх
 * багато на магазин і вони не просять ані `page_data`, ані подання в боті.
 *
 * Сховище — `@wwwuabot/shared/database/tables`, господар `api-dev`; правила
 * адреси, видимості й замовлень — `docs/SHOPS.md`.
 *
 * @module @wwwuabot/shared/shop
 */

export {
  DEFAULT_PRODUCT_KIND,
  PRODUCT_KINDS,
  PRODUCT_KIND_SPECS,
  isProductKind,
  productKindHasFile,
  productKindLabel,
  productKindNeedsShipping,
} from "./kinds";
export type { ProductKind, ProductKindSpec } from "./kinds";

export {
  ATTRIBUTE_NAME_MAX,
  ATTRIBUTE_VALUE_MAX,
  PRODUCT_ATTRIBUTES_MAX,
  PRODUCT_DESCRIPTION_MAX,
  PRODUCT_IMAGES_MAX,
  PRODUCT_PRICE_MAX,
  PRODUCT_SLUG_MAX,
  PRODUCT_SUMMARY_MAX,
  PRODUCT_TITLE_MAX,
  cleanImageIds,
  productAddress,
  productDraft,
  sanitizeDescription,
  sanitizeLine,
  sanitizeProductAttributes,
  validateProductDraft,
} from "./products";
export type { ProductAddressResult, ProductInput, ProductValidation } from "./products";

export {
  ORDER_ITEMS_MAX,
  ORDER_NOTE_MAX,
  ORDER_QTY_MAX,
  cleanOrderItems,
  orderContactFields,
  sanitizeOrderContact,
  validateOrderDraft,
} from "./orders";
export type {
  OrderContactField,
  OrderContactResult,
  OrderDraftInput,
  OrderItemInput,
  OrderValidation,
} from "./orders";

export type {
  CatalogResponse,
  MediaDeleteResponse,
  MediaListResponse,
  MediaSaveResponse,
  OrderContact,
  OrderItem,
  OrderListResponse,
  OrderSaveResponse,
  ProductAttribute,
  ProductDeleteResponse,
  ProductDraft,
  ProductListResponse,
  ProductSaveResponse,
  ShopMedia,
  ShopOrder,
  ShopProduct,
  StatusListResponse,
} from "./types";

export {
  SHOP_MEDIA_IMAGE_LABELS,
  SHOP_MEDIA_IMAGE_TYPES,
  SHOP_MEDIA_KINDS,
  SHOP_MEDIA_MAX_BYTES,
  SHOP_MEDIA_URL_PREFIX,
  formatBytes,
  imageTypesLabel,
  isImageMime,
  isShopMediaKey,
  mediaKey,
  mediaKindForMime,
  mediaRandomToken,
  mediaUrl,
  safeMediaName,
  validateMediaUpload,
} from "./media";
export type { MediaKind, MediaUploadCheck } from "./media";

export { createShopApi } from "./api";
export type {
  ShopApi,
  ShopApiPaths,
  ShopProducts,
  ShopTransport,
  ShopUploadTransport,
} from "./api";

export {
  DEFAULT_ORDER_STATUSES,
  ORDER_STATUS_KEY_MAX,
  ORDER_STATUS_LABEL_MAX,
  activeOrderStatuses,
  isDefaultOrderStatusKey,
  isValidOrderStatusKey,
  orderStatusLabel,
  resolveOrderStatuses,
  sanitizeStatusLabel,
  validateOrderStatusOverride,
} from "./statuses";
export type {
  DefaultOrderStatus,
  OrderStatus,
  OrderStatusOverride,
  OrderStatusOverrideInput,
  OrderStatusOverrideValidation,
  OrderStatusStage,
} from "./statuses";
