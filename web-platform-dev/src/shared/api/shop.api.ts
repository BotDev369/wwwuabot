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
 * сервер не розібрав би форми. Тому файл їде через `apiFetchRaw` — ті самі
 * заголовки ідентичності, але без заголовка вмісту.
 *
 * @module web-platform-dev/src/shared/api
 */

import { createShopApi } from "@wwwuabot/shared/shop";
import { apiFetch, apiFetchRaw } from "./client";

/** Відповідь на завантаження у тій самій формі, що й решта шляхів. */
async function uploadForm<T>(path: string, form: FormData): Promise<T> {
  const response = await apiFetchRaw(path, { method: "POST", body: form });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${response.status}`);
  }
  return (await response.json()) as T;
}

export const shopApi = createShopApi(apiFetch, uploadForm, {
  products: "/api/user/shop/products",
  media: "/api/user/shop/media",
  catalog: "/api/space/shop/products",
});
