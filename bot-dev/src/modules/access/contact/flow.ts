/**
 * Діалог з адміном: **потік без Telegram**.
 *
 * Один крок — одна дія — один наслідок (`ContactOutcome`), а «як це показати»
 * вирішує вже або реплай-клавіатура (`reply.ts`), або панель на повідомленні
 * (`panel.ts`). Розділено саме тому, що обидва способи натиснути кнопку мусять
 * вести в одне й те саме місце: два потоки означали б, що «Відправити» з
 * клавіатури й «Відправити» на панелі роблять різні речі.
 *
 * **Це єдиний шлях, який пише поза гейтом допуску.** Звернення йде в ту саму
 * таблицю `access_requests`, що й повідомлення з Mini App, і окремим листом
 * падає адміну в Telegram.
 *
 * **Нічого не відправляється без натискання.** Кожне повідомлення одразу лягає
 * в чернетку (`admin_dialog_text`): надіслати раніше ми не можемо, бо тоді в
 * людини не було б кнопки «Закрити без відправки» — тобто «я передумав».
 *
 * **Хто йому пише:** `sendMessage` на адмінський Telegram-id. Відповідь адміна
 * прийде згодом окремим кроком, а поки що адмін бачить лише суть — хто
 * написав і що.
 *
 * @module bot-dev/src/modules/access/contact/flow
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { sanitizeAccessRequestText } from "@wwwuabot/shared/access-requests";
import type { AppContext } from "../../../shared/types/env";
import { log } from "../../../shared/utils/debug";
import {
  appendDraft,
  buildAdminNotice,
  readContactState,
  splitForTelegram,
  type ContactAction,
  type ContactState,
} from "./state";

/** Telegram-id адміністратора, якому падають звернення. */
export const ADMIN_TELEGRAM_ID = 372567448;

/** Що зробила дія — і що тепер показати людині. */
export type ContactOutcome =
  | { kind: "opened"; state: ContactState }
  | { kind: "draft"; state: ContactState; truncated: boolean }
  | { kind: "sent"; state: ContactState }
  | { kind: "closed"; state: ContactState; kept: boolean }
  /** Нетекстове повідомлення: пояснити, що читаємо лише текст. */
  | { kind: "text-only"; state: ContactState }
  | { kind: "failed"; state: ContactState }
  /** Не наша дія — хай далі розбирає роутер. */
  | { kind: "ignored"; state: ContactState };

/**
 * Виконати дію й повернути стан, який треба показати.
 *
 * `action` — натиснута кнопка, `text` — свіжий текст людини (для чернетки) або
 * `undefined`, коли прийшло фото/файл/стікер.
 */
export async function applyContactAction(
  ctx: AppContext,
  action: ContactAction | null,
  text?: string,
): Promise<ContactOutcome> {
  const user = ctx.user;
  if (!user) return { kind: "ignored", state: readContactState(user) };

  const state = readContactState(user);

  // «Написати адміну» з екрана відмови не стирає чернетку: той самий до��туп є й
  // на панелі, тож повторне натискання лише показує стан, а не починає заново.
  if (action === "write") {
    return state.open
      ? { kind: "draft", state, truncated: false }
      : { kind: "opened", state: setState(ctx, true, "") };
  }

  switch (action) {
    case "close":
    case "close-without-send":
      return { kind: "closed", state: setState(ctx, false, ""), kept: false };
    case "send":
      return submit(ctx, state);
    case "send-close":
      return submit(ctx, state, true);
    default:
      break;
  }

  if (text === undefined) return { kind: "text-only", state };
  if (text.startsWith("/")) return { kind: "ignored", state };

  const { text: draft, truncated } = appendDraft(state.draft, text);
  return { kind: "draft", state: setState(ctx, true, draft), truncated };
}

/**
 * Зберегти звернення й сказати людині, що воно прийшло.
 *
 * Порожня чернетка — це не помилка, а «нічего не написано»: тоді просто
 * закриваємо діалог, бо надсилати порожній рядок у базу нездачно.
 */
async function submit(
  ctx: AppContext,
  state: ContactState,
  finish = false,
): Promise<ContactOutcome> {
  const user = ctx.user!;
  const text = sanitizeAccessRequestText(state.draft);
  if (!text) return { kind: "closed", state: setState(ctx, false, ""), kept: false };

  try {
    await ensureTables(ctx.env.DB, ["access_requests"]);
    await ctx.env.DB.prepare("INSERT INTO access_requests (user_id, text) VALUES (?, ?)")
      .bind(user.user_id, text)
      .run();
  } catch (err) {
    // «Відправлено» тут було б брехнею: чернетку лишаємо, щоб не змушати
    // людину набирати написане заново.
    log("ACCESS", "contact request save failed", { error: String(err) });
    return { kind: "failed", state };
  }

  await notifyAdmin(ctx, text);
  return { kind: "sent", state: setState(ctx, !finish, "") };
}

/**
 * Лист адміну: шапка окремим повідомленням, далі сам текст — бо межа звернення
 * втричі більша, ніж те, що Telegram приймає за одне повідомлення.
 */
async function notifyAdmin(ctx: AppContext, text: string): Promise<void> {
  try {
    await ctx.api.sendMessage(ADMIN_TELEGRAM_ID, buildAdminNotice(ctx.user!));
    for (const part of splitForTelegram(text)) {
      await ctx.api.sendMessage(ADMIN_TELEGRAM_ID, part);
    }
  } catch (err) {
    // Звернення вже в базі й його видно в панелі, тож невдача Telegram лише
    // означає, що адмін не отримав копію в чаті.
    log("ACCESS", "admin notification failed", { error: String(err) });
  }
}

/** Стан у базі; `ctx.userDirty` записує його post-middleware. */
function setState(ctx: AppContext, open: boolean, text: string): ContactState {
  const user = ctx.user!;
  user.admin_dialog_open = open ? 1 : 0;
  user.admin_dialog_text = text;
  ctx.userDirty = true;

  const state = readContactState(user);
  user.admin_panel_id = state.panelId;
  return state;
}
