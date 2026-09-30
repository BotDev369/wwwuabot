/**
 * Прохання про допуск — запит зі сторінки відмови.
 *
 * **Підпис додається тут, а не віриться клієнту.** `initData` іде тим самим
 * способом, що й решта запитів платформи (`telegramAuthHeaders`), тож `user_id`
 * у рядку — справжній Telegram-id, а не те, що надіслав клієнт.
 *
 * **Повертає «збереглося чи ні», а не кидає.** Людина, яка пише адміну зі
 * сторінки відмови, має дізнатися про збій із тексту на екрані (форма показує
 * «спробуйте ще раз»), а не зі спливаючої помилки в консолі.
 *
 * @module web-platform-dev/src/shared/api/access.api
 */

import { telegramAuthHeaders } from "@wwwuabot/shared/security/telegram";

/** Надіслати прохання про допуск. `false` — не збереглося. */
export async function sendAccessRequest(text: string): Promise<boolean> {
  try {
    const response = await fetch("/api/user/access-request", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...telegramAuthHeaders() },
      body: JSON.stringify({ text }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
