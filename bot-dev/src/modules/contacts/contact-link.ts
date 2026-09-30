/**
 * Перехід за особистим лінком контакту — один крок, який бот робить під час
 * `/start`.
 *
 * Окремо від репозиторію тому, що тут **рішення**, а не запит: кого закріпити,
 * кого ні й що робити з переходом. Правила короткі, але кожне має причину:
 *
 * - **себе не запрошують** — власник, який відкрив власний лінк, не робить
 *   себе власним контактом;
 * - **вітаємо лише з першого переходу** — тому результат розрізняє `invited` і
 *   `revisit`, а не зводиться до «перехід був»;
 * - **повторний перехід нічого не змінює** — контакт закріплено раз
 *   (`contact.repository`), тож другий дотик того самого лінка безпечний;
 * - **це часткове приєднання** — людина увійшла в бота, і це все, що бот може
 *   підтвердити; вхід на платформу ставит `api-dev`, коли вона відкриє Mini
 *   App (куди веде кнопка на головній). Тут же записується `users.inviter_id`:
 *   бот закритий за запрошеннями, і без цього поля перехід нічого не відкриває;
 * - **власний лінк теж не запрошення** — він каже, що код наш, але не дає
 *   нікому нічого: закріплювати власника з самим собою незрозуміло;
 * - **невідомий код — не запрошення**, і тоді payload живе далі своїм життям
 *   (це може бути адреса сторінки).
 *
 * Повертає **що саме сталося** (див. `ContactPayloadResult`): роутер після
 * цього не шукає сторінку з таким «payload» — код не є адресою, і показувати на
 * нього 404 було б брехнею про те, що сталося. Але й не кожен перехід —
 * запрошення: вітаємо **лише перший** (`invited`), решта показують звичайну
 * головну.
 *
 * @module bot-dev/src/modules/contacts
 */

import type { AppContext } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";
import { ContactRepository, type ContactRecord } from "./contact.repository";

/**
 * Що дало розпізнавання переходу.
 *
 * - `invited` — код наш, і **ця людина щойно закріпилась** за контактом: тільки
 *   тут доречне вітання;
 * - `revisit` — код наш, але закріплення вже відбулось (та сама людина вдруге
 *   або лінк уже зайнятий кимось іншим): привітання вдруге було б брехнею;
 * - `own` — за власним лінком прийшов сам власник: закріплювати нікого;
 * - `unknown` — код не наш, і payload далі живе своїм життям (може, це адреса).
 */
export type ContactPayloadResult =
  | { kind: "unknown" }
  | { kind: "own" }
  | { kind: "revisit" }
  | { kind: "invited"; ownerId: number };

/**
 * Обробляє payload як можливий код запрошення.
 * `unknown` — це не наш код; решта — перехід оброблено.
 */
export async function applyContactPayload(
  ctx: AppContext,
  payload: string,
): Promise<ContactPayloadResult> {
  const userId = ctx.from?.id;

  const contacts = new ContactRepository(ctx.env);
  let contact: ContactRecord | null;
  try {
    contact = await contacts.findByCode(payload);
  } catch (e: unknown) {
    // База недоступна — це не привід падати: людина має побачити бота.
    log("CONTACT", "lookup failed", { payload, error: String(e) });
    return { kind: "unknown" };
  }

  if (!contact) return { kind: "unknown" };

  if (!userId || userId === contact.owner_id) {
    log("CONTACT", "own or anonymous link | nothing to attach", { contact_id: contact.id });
    return { kind: "own" };
  }

  if (contact.joined_user_id !== null) {
    log("CONTACT", "link already attached", {
      contact_id: contact.id,
      attached_user_id: contact.joined_user_id,
    });
    // Повторний перехід **саме цієї** людини: допуск їй уже належить, тож
    // нагадувати `users.inviter_id` не зайве, а без нього людина, що прийшла
    // ще до появи колонки, побачила б відмову за власним лінком.
    if (contact.joined_user_id === userId) rememberInviter(ctx, contact.owner_id);
    return { kind: "revisit" };
  }

  try {
    const attached = await contacts.attach(contact.id, userId, ctx.from?.username ?? null);
    log("CONTACT", attached ? "contact joined the bot" : "link taken meanwhile", {
      contact_id: contact.id,
      owner_id: contact.owner_id,
      user_id: userId,
    });
    if (!attached) return { kind: "revisit" };

    rememberInviter(ctx, contact.owner_id);
    return { kind: "invited", ownerId: contact.owner_id };
  } catch (e: unknown) {
    log("CONTACT", "attach failed", { contact_id: contact.id, error: String(e) });
    return { kind: "revisit" };
  }
}

/**
 * Запам'ятати, хто запросив людину.
 *
 * **Пишемо тут, а не в роутері.** `contacts.joined_user_id` уже каже «ця людина
 * прийшла за цим контактом», тож `users.inviter_id` — те саме відповідь на те
 * саме питання, лише з боку людини. Одне місце запису важливе й для іншого:
 * саме воно вирішує, чи бачить вона бот (`modules/access`).
 *
 * `null` не перезаписуємо: перший запит — справжній, а наступні переходи того
 * самого лінка не повинні міняти того, хто запросив, на іншого.
 */
function rememberInviter(ctx: AppContext, ownerId: number): void {
  if (!ctx.user || (ctx.user.inviter_id !== null && ctx.user.inviter_id !== undefined)) return;

  ctx.user.inviter_id = ownerId;
  ctx.userDirty = true;
  log("CONTACT", "inviter remembered", { user_id: ctx.user.user_id, inviter_id: ownerId });
}
