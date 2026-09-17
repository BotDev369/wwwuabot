/**
 * Перехід за особистим лінком — один крок, який бот робить під час `/start`.
 *
 * Окремо від репозиторію тому, що тут **рішення**, а не запит: кого закріпити,
 * кого ні й що робити з переходом. Правила короткі, але кожне має причину:
 *
 * - **себе не запрошують** — власник, який відкрив власний лінк, не робить
 *   себе власним контактом;
 * - **повторний перехід нічого не змінює** — контакт закріплено раз
 *   (`invite.repository`), тож другий дотик того самого лінка безпечний;
 * - **невідомий код — не запрошення**, і тоді payload живе далі своїм життям
 *   (це може бути адреса сторінки).
 *
 * Повертає `true`, якщо перехід був запрошенням: роутер після цього не шукає
 * сторінку з таким «payload» — код не є адресою, і показувати на нього 404
 * було б брехнею про те, що сталося.
 *
 * @module bot-dev/src/modules/invites
 */

import type { AppContext } from "../../shared/types/env";
import { log } from "../../shared/utils/debug";
import { InviteRepository, type InviteRecord } from "./invite.repository";

/**
 * Обробляє payload як можливий код запрошення.
 * `true` — це був код (перехід оброблено), `false` — код не наш.
 */
export async function applyInvitePayload(ctx: AppContext, payload: string): Promise<boolean> {
  const userId = ctx.from?.id;

  const invites = new InviteRepository(ctx.env);
  let invite: InviteRecord | null;
  try {
    invite = await invites.findByCode(payload);
  } catch (e: unknown) {
    // База недоступна — це не привід падати: людина має побачити бота.
    log("INVITE", "lookup failed", { payload, error: String(e) });
    return false;
  }

  if (!invite) return false;

  if (!userId || userId === invite.owner_id) {
    log("INVITE", "own or anonymous link | nothing to attach", { invite_id: invite.id });
    return true;
  }

  if (invite.invited_user_id !== null) {
    log("INVITE", "link already attached", {
      invite_id: invite.id,
      attached_user_id: invite.invited_user_id,
    });
    return true;
  }

  try {
    const attached = await invites.attachContact(invite.id, userId);
    log("INVITE", attached ? "contact attached" : "link taken meanwhile", {
      invite_id: invite.id,
      owner_id: invite.owner_id,
      user_id: userId,
    });
  } catch (e: unknown) {
    log("INVITE", "attach failed", { invite_id: invite.id, error: String(e) });
  }

  return true;
}
