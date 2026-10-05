/**
 * Магазин у платформі — свої товари, файли й публічний каталог.
 *
 * Форму запиту тримає спільний клієнт (`@wwwuabot/shared/shop`): тут лишаються
 * тільки **шляхи** й те, чого в спільного клієнта бути не може, — транспорт
 * завантаження. Своє читається з-під підписаного `initData`, а каталог
 * публічний; переплутати їх означало б показати чернетки покупцеві.
 *
 * **Завантаження йде повз JSON-транспорт навмисно.** Спільний `apiFetch` ставить
 * `Content-Type: application/json`; для multipart це зіпсувало б межу частин, і
 * сервер не розібрав би форми. Тому файл їде через `apiUpload` — ті самі
 * заголовки ідентичності, але без заголовка вмісту (спільно з фото в листуванні).
 *
 * @module web-platform-dev/src/shared/api
 */

import { createShopApi } from "@wwwuabot/shared/shop";
import { apiFetch, apiUpload } from "./client";

export const shopApi = createShopApi(apiFetch, apiUpload, {
  products: "/api/user/shop/products",
  media: "/api/user/shop/media",
  catalog: "/api/space/shop/products",
  orders: "/api/user/shop/orders",
  orderStatus: "/api/user/shop/orders/status",
  // Замовляють **за адресою** магазину: номера покупцеві ніхто не казав.
  placeOrder: "/api/space/shop/orders",
  statuses: "/api/user/shop/statuses",
});
