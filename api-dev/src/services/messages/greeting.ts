/**
 * Одноразове вітання пари — те, що відкриває розмову після запрошення.
 *
 * **Навіщо.** Людина прийшла в продукт за особистим лінком, і її перший екран —
 * порожня розмова. Порожнє поле не пояснює ні того, хто на іншому кінці, ні
 * того, що контакт справді встановлено, — а це два факти, заради яких людина й
 * натиснула кнопку в боті. Обидва лягають у стрічку **до** першого
 * повідомлення, і читають їх обоє: рядок у переписці один на двох.
 *
 * **Вітаємо лише того, хто прийшов за лінком** (`isInvitedBy`) — і ніколи того,
 * хто запросив. Інакше автор запрошення дістав би «вас запрошено» у розмові, до
 * якої сам і покликав.
 *
 * **Вітання ставиться рівно раз, і це вирішує база.** `greeted_at` у розмові —
 * ознака, яку виграє один `UPDATE … WHERE greeted_at IS NULL`: двоє одночасних
 * відкриттів (людина відкрила посилання і згорнула) не дадуть двох привітань.
 * Питати замість цього «чи порожня стрічка» не можна з тієї ж причини, з якої
 * не можна питати склад: між питанням і відповіддю хтось устигає написати.
 *
 * **Чому перевірка наявних повідомлень усе одно є.** Вітання — це початок
 * переписки, а не вставка посеред неї: якщо перший уже написав (він міг
 * почати розмову зі свого боку, не чекаючи), привітання прийшло б поверх
 * живого діалогу.
 *
 * @module api-dev/src/services/messages/greeting
 */

import type { Env } from "../../shared/types";
import {
  SYSTEM_SENDER_ID,
  greetingNotes,
  messagePreview,
  peerPublicLabel,
} from "@wwwuabot/shared/messages";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import { apiLog } from "../../shared/logger";
import { ensureConversation } from "./conversations";
import { isInvitedBy } from "./links";
import { readPeer } from "./peers";

/**
 * Покласти вітання в розмову, якщо воно ще не було — і якщо його тут чекають.
 *
 * Помилка тут не має ламати читання: людина відкриває розмову, і краще показати
 * її без привітання, ніж не показати зовсім. Тому ця функція ніколи не кидає.
 */
export async function ensureGreeting(env: Env, me: number, peerId: number): Promise<void> {
  try {
    if (!(await isInvitedBy(env.DB, me, peerId))) return;

    const conversationId = await ensureConversation(env.DB, me, peerId);
    if (!conversationId) return;

    const existing = await env.DB.prepare(
      "SELECT id FROM messages WHERE conversation_id = ? LIMIT 1",
    )
      .bind(conversationId)
      .first<{ id: number }>();
    if (existing) return;

    const now = formatSqliteDatetime();
    const claimed = await env.DB.prepare(
      "UPDATE conversations SET greeted_at = ? WHERE id = ? AND greeted_at IS NULL",
    )
      .bind(now, conversationId)
      .run();
    if ((claimed.meta?.changes ?? 0) === 0) return;

    const inviter = await readPeer(env.DB, peerId, me);
    const notes = greetingNotes(peerPublicLabel(inviter));

    // Номер розмови той самий, тож останок списку оновлюємо тим самим правилом,
    // що й `sendMessage`: список розмов читає `last_message_*`, а не `messages`.
    const statements = notes.map((body) =>
      env.DB.prepare(
        `INSERT INTO messages (conversation_id, sender_id, body, created_at, read_at, is_system)
           VALUES (?, ?, ?, ?, ?, 1)`,
      ).bind(conversationId, SYSTEM_SENDER_ID, body, now, now),
    );
    statements.push(
      env.DB.prepare(
        `UPDATE conversations SET last_message_at = ?, last_message_text = ?, last_sender_id = ?
           WHERE id = ?`,
      ).bind(now, messagePreview(notes.at(-1) ?? ""), SYSTEM_SENDER_ID, conversationId),
    );

    await env.DB.batch(statements);
  } catch (e: unknown) {
    apiLog.error("Greeting error", e);
  }
}
