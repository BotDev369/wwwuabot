/**
 * Шляхи магазину — одним модулем, бо це **один домен**: товари, файли,
 * замовлення й статуси.
 *
 * **Навіщо окремо.** Роутер — це список шляхів усього воркера, і кожен
 * наступний домен додає в нього рядки; коли магазин додав замовлення, список
 * перетнув межу в 400 рядків, за якою файл уже ніхто не читає цілком
 * (`AGENTS.md` §3). Тут ті самі умови, що були в роутері, — переїхали разом із
 * поясненнями, а не розділились навпіл.
 *
 * **Дві групи в одному файлі навмисно.** Власне (`/api/user/shop/…`, з
 * ідентичністю з підписаного `initData`) і публічне (`/api/space/shop/…` і сам
 * файл `/api/shop/media/<…>`). Порядок тут такий самий, як бути в роутері:
 * власні шляхи, потім публічні — і жодна умова не збігається з іншою, бо всі
 * вони порівнюють шлях цілком.
 *
 * @module api-dev/src/routes/shop
 */

import type { Env } from "../shared/types";
import { decodePathSegment } from "../shared/url";
import { handleUserShopProducts, handleSpaceShopProducts } from "../controllers/shop.controller";
import { handleUserShopMedia, handleShopMediaFile } from "../controllers/shop-media.controller";
import {
  handleUserShopOrders,
  handleUserShopStatuses,
  handleSpaceShopOrders,
} from "../controllers/shop-orders.controller";

/**
 * Обробити шлях магазину; `null` — це не він (роутер іде далі).
 *
 * Повертає саме `null`, а не 404: «не магазин» і «нічого не знайшлось» — різні
 * речі, і другою відповіддю володіє роутер. Відповідь може бути готовою
 * (`badRequest`) або обіцянкою (контролер) — роутер у `async`-функції приймає
 * обидві, і чекати її тут означало б зайвий `await` на кожному шляху.
 */
export function matchShopRoute(
  request: Request,
  env: Env,
  pathname: string,
): Response | Promise<Response> | null {
  // Товари — власні (разом із чернетками) і каталог відкритого магазину.
  // Власника бере з підписаного `initData` контролер; номер магазину приходить
  // від клієнта, тож право продавця перевіряє запит до бази.
  if (pathname === "/api/user/shop/products") return handleUserShopProducts(request, env);
  if (pathname === "/api/user/shop/media") return handleUserShopMedia(request, env);

  // Замовлення: `GET` — свого магазину (за `shop`), `POST` — статус. Два шляхи в
  // одному контролері тому, що це один факт — замовлення, а бік у нього різний
  // (docs/SHOPS.md §6).
  if (pathname === "/api/user/shop/orders" || pathname === "/api/user/shop/orders/status") {
    return handleUserShopOrders(request, env);
  }

  // Статуси магазину — те, з чого вибирає екран продавця: типові з його
  // правками, а не перелік у клієнті (docs/SHOPS.md §7).
  if (pathname === "/api/user/shop/statuses" && request.method === "GET") {
    return handleUserShopStatuses(request, env);
  }

  // Файл магазину — публічний шлях, і це навмисно: фото читають Telegram і веб
  // **без** `initData`, а адресу не можна вгадати (у ключі випадкова частка).
  // У бакета публічного доступу немає — єдиний шлюз це `api-dev`
  // (docs/SHOPS.md §5).
  if (pathname.startsWith("/api/shop/media/")) {
    const key = decodePathSegment(pathname.replace("/api/shop/media/", ""));
    if (key === null) return badRequest();
    return handleShopMediaFile(env, key);
  }

  // Каталог магазину — теж публічно: `is_public = 1` і `is_active = 1` відбирає
  // запит до бази, тож закритий магазин не дістається й прямим запитом.
  if (pathname === "/api/space/shop/products" && request.method === "GET") {
    return handleSpaceShopProducts(request, env);
  }

  // Замовити — за **адресою** магазину, а не за номером: покупцеві відомий лише
  // хвіст `/<магазин>`, і видимість відбирає запит до бази, а не цей шлях.
  // Покупець при цьому обов'язковий: замовлення мусить бути кому відповісти.
  if (pathname === "/api/space/shop/orders" && request.method === "POST") {
    return handleSpaceShopOrders(request, env);
  }

  return null;
}

/** 400 для некоректного кодування в шляху (див. `decodePathSegment`). */
function badRequest(): Response {
  return new Response("Bad Request", { status: 400 });
}
