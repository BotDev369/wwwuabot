/**
 * Перехід за особистим лінком контакту — один крок, який бот робить під час
 * `/start`.
 *
 * Окремо від репозиторію тому, що тут **рішення**, а не запит: кого закріпити,
 * кого ні й що робити з переходом. Правила короткі, але кожне має причину:
 *
 * - **себе не запрошують** — власник, який відкрив власний лінк, не робить
 *   себе власним контактом;
 * - **повторний перехід нічого не змінює** — контакт закріплено раз
 *   (`contact.repository`), тож другий дотик того самого лінка безпечний;
 * - **це часткове приєднання** — людина увійшла в бота, і це все, що бот може
 *   підтвердити; вхід на платформу ставить `api-dev`, коли вона відкриє Mini
 *   App (куди веде кнопка на головній);
 * - **невідомий код — не запрошення**, і тоді payload живе далі своїм життям
 *   (це може бути адреса сторінки).
 *
 * Повертає `true`, якщо перехід був запрошенням: роутер після цього не шукає
 * сторінку з таким «payload» — код не є адресою, і показувати на нього 404
 * було б брехнею про те, що сталося.
 *
 * @module bot-dev/src/modules/contacts
 */

import type { AppContext } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";
import { ContactRepository, type ContactRecord } from "./contact.repository";

/**
 * Обробляє payload як можливий код запрошення.
 * `true` — це був код (перехід оброблено), `false` — код не наш.
 */
export async function applyContactPayload(ctx: AppContext, payload: string): Promise<boolean> {
  const userId = ctx.from?.id;

  const contacts = new ContactRepository(ctx.env);
  let contact: ContactRecord | null;
  try {
    contact = await contacts.findByCode(payload);
  } catch (e: unknown) {
    // База недоступна — це не привід падати: людина має побачити бота.
    log("CONTACT", "lookup failed", { payload, error: String(e) });
    return false;
  }

  if (!contact) return false;

  if (!userId || userId === contact.owner_id) {
    log("CONTACT", "own or anonymous link | nothing to attach", { contact_id: contact.id });
    return true;
  }

  if (contact.joined_user_id !== null) {
    log("CONTACT", "link already attached", {
      contact_id: contact.id,
      attached_user_id: contact.joined_user_id,
    });
    return true;
  }

  try {
    const attached = await contacts.attach(contact.id, userId, ctx.from?.username ?? null);
    log("CONTACT", attached ? "contact joined the bot" : "link taken meanwhile", {
      contact_id: contact.id,
      owner_id: contact.owner_id,
      user_id: userId,
    });
  } catch (e: unknown) {
    log("CONTACT", "attach failed", { contact_id: contact.id, error: String(e) });
  }

  return true;
}
