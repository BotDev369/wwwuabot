/**
 * Позначка про замовлення в розмові покупця з тими, хто веде магазин.
 *
 * **Оповіщення — це розмова, а не друга система** (`docs/SHOPS.md` §8): ані
 * Telegram-груп, ані пошти, ані шаблонів. Першим повідомленням у розмові йде
 * позначка платформи (`is_system`, автора немає) — тим самим механізмом, що
 * вітає пару за особистим лінком.
 *
 * **Замовлення і є зв'язком**, тож окремої згоди на розмову не питаємо; читає
 * про це `links.ts`, а не цей файл. Помилка тут не має зривати замовлення: воно
 * вже збережене, а переписка — спосіб про нього дізнатись, не місце, де воно
 * живе.
 *
 * **Розмова кожному — своя.** `conversations` описує пару **людей**, а не
 * «сторону магазину»: спільний чат на продавця й адмінів вимагав би другої
 * таблиці й другого правила «хто в ній є». Тому адресатів стільки, скільки тих,
 * хто веде магазин (`shopStaffIds`), і кожен бачить покупця у своєму списку
 * розмов.
 *
 * **`read_at` лишається порожнім навмисно**: саме за ним світиться бейдж
 * непрочитаного, і це єдине, що кличе людину в продукт.
 *
 * **Виділено з `orders.service.ts`** — не заради рядків, а заради межі: сервіс
 * відповідає на «що можна замовити», а це — «хто про це дізнається», і міняються
 * вони з різних причин.
 *
 * @module api-dev/src/services/shop/orders-notice
 */

import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import { SYSTEM_SENDER_ID, messagePreview } from "@wwwuabot/shared/messages";
import { orderNoticeText, type ShopOrder } from "@wwwuabot/shared/shop";
import { apiLog } from "../../shared/logger";
import { ensureConversation } from "../messages/conversations";
import { shopStaffIds, type ShopScope } from "./shops";

export async function notifyOrder(
  db: D1Database,
  shop: ShopScope,
  buyerId: number,
  order: ShopOrder,
): Promise<void> {
  // Той, хто веде магазин і пробує власну вітрину, замовляє сам у себе — і
  // розмову із собою відкривати нікому: друга сторона тут та сама людина.
  const recipients = shopStaffIds(shop).filter((id) => id !== buyerId);
  if (recipients.length === 0) return;

  const now = formatSqliteDatetime();
  const body = orderNoticeText(order, shop.title);

  for (const recipientId of recipients) {
    try {
      const conversationId = await ensureConversation(db, buyerId, recipientId);
      if (!conversationId) continue;

      await db.batch([
        db
          .prepare(
            `INSERT INTO messages (conversation_id, sender_id, body, created_at, read_at, is_system)
               VALUES (?, ?, ?, ?, NULL, 1)`,
          )
          .bind(conversationId, SYSTEM_SENDER_ID, body, now),
        // Список розмов читає `last_message_*`, а не `messages` — те саме
        // оновлення, що й у `sendMessage`.
        db
          .prepare(
            `UPDATE conversations SET last_message_at = ?, last_message_text = ?, last_sender_id = ?,
                    hidden_a = 0, hidden_b = 0
               WHERE id = ?`,
          )
          .bind(now, messagePreview(body), SYSTEM_SENDER_ID, conversationId),
      ]);
    } catch (e: unknown) {
      apiLog.error("Shop order notice error", e);
    }
  }
}
