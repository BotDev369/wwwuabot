/**
 * Діалог з адміном для людини без допуску — **безпечна частина**.
 *
 * **Це єдиний шлях, який пише поза гейтом допуску.** Людина не має доступу до
 * платформи й контенту, але мусить мати десь сказати «ось моє питання», тож
 * звернення йде в ту саму таблицю `access_requests`, що й повідомлення з Mini
 * App, і окремим листом падає адміну в Telegram.
 *
 * **Нічого не відправляється без натискання.** Кожне повідомлення одразу лягає
 * в чернетку (`admin_dialog_text`): надіслати раніше ми не можемо, бо тоді в
 * людини не було б кнопки «Закрити без відправки» — тобто «я передумав».
 *
 * **Фото, файли та стікери не читаємо** — кажемо про це й лишаємо чернетку
 * незмінною: мовчки ігнорувати означало б, що повідомлення загубилося.
 *
 * **Хто йому пише:** `sendMessage` на адмінський Telegram-id. Відповідь адміна
 * прийде згодом окремим кроком (разом із пов'язкою «повідомлення ↔ рядок»), а
 * поки що адмін бачить лише суть — хто написав і що.
 *
 * @module bot-dev/src/modules/access/contact/dialog
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { sanitizeAccessRequestText } from "@wwwuabot/shared/access-requests";
import type { AppContext } from "../../../shared/types/env";
import { CONTACT } from "../../../shared/config/texts";
import { log } from "../../../shared/utils/debug";
import { deleteIncomingMessage } from "../../../shared/utils/message";
import {
  appendDraft,
  buildAccessKeyboard,
  buildAdminNotice,
  buildContactKeyboard,
  readContactAction,
  readContactState,
  splitForTelegram,
} from "./state";

/** Telegram-id адміністратора, якому падають звернення. */
export const ADMIN_TELEGRAM_ID = 372567448;

/**
 * Крокнути діалогом; `false` — це не наш текст, хай далі розбирає роутер.
 *
 * Тут живуть усі нетекстові випадки (фото, стікер, файл), бо звичайний
 * текстовий шлях їх не бачить узагалі, а людина в діалозі мусить щось
 * отримати у відповідь.
 */
export async function handleContactFlow(ctx: AppContext): Promise<boolean> {
  if (!ctx.user) return false;

  const text = ctx.message?.text;
  const action = text ? readContactAction(text) : null;
  const state = readContactState(ctx.user);

  if (!state.open) {
    if (action !== "write") return false;
    await startDialog(ctx);
    return true;
  }

  // Команда — не чернетка: `/start` лишається тим, чим є (екран відмови), а
  // написане не зникає. Людина вирішує сама, коли повернутися.
  if (text?.startsWith("/")) return false;

  await deleteIncomingMessage(ctx);

  switch (action) {
    case "write":
      return true;
    case "close":
    case "close-without-send":
      return closeDialog(ctx, false);
    case "send":
      return submit(ctx, false);
    case "send-close":
      return submit(ctx, true);
    default:
      break;
  }

  if (text === undefined) {
    await say(ctx, CONTACT.textOnly);
    return true;
  }

  return appendMessage(ctx, text);
}

/** «Написати адміну»: відкриваємо діалог із порожньою чернеткою. */
async function startDialog(ctx: AppContext): Promise<void> {
  await deleteIncomingMessage(ctx);
  setState(ctx, true, "");
  await say(ctx, CONTACT.started, buildContactKeyboard(readContactState(ctx.user)));
}

/** Дописати повідомлення й показати клавіатуру з кнопками відправки. */
async function appendMessage(ctx: AppContext, message: string): Promise<boolean> {
  const state = readContactState(ctx.user);
  const { text, truncated } = appendDraft(state.draft, message);
  setState(ctx, true, text);

  await say(
    ctx,
    truncated ? CONTACT.limit : CONTACT.appended,
    buildContactKeyboard({ open: true, draft: text }),
  );
  return true;
}

/**
 * Зберегти звернення й сказати людині, що воно прийшло.
 *
 * Порожня чернетка — це не помилка, а «нічего не написано»: тоді просто
 * закриваємо діалог, бо надсилати порожній рядок у базу нездачно.
 */
async function submit(ctx: AppContext, finish: boolean): Promise<boolean> {
  const state = readContactState(ctx.user);
  const text = sanitizeAccessRequestText(state.draft);
  if (!text) return closeDialog(ctx, false);

  try {
    await ensureTables(ctx.env.DB, ["access_requests"]);
    await ctx.env.DB.prepare("INSERT INTO access_requests (user_id, text) VALUES (?, ?)")
      .bind(ctx.user!.user_id, text)
      .run();
  } catch (err) {
    // «Відправлено» тут було б брехнею: чернетку лишаємо, щоб не змушати
    // людину набирати написане заново.
    log("ACCESS", "contact request save failed", { error: String(err) });
    await say(ctx, CONTACT.failed, buildContactKeyboard(state));
    return true;
  }

  await notifyAdmin(ctx, text);
  setState(ctx, !finish, "");
  await say(ctx, CONTACT.sent, buildAccessKeyboard(readContactState(ctx.user)));
  return true;
}

/**
 * Закрити діалог. `kept` — чи пішло написане адміну (тоді про це кажемо).
 */
async function closeDialog(ctx: AppContext, kept: boolean): Promise<boolean> {
  setState(ctx, false, "");
  await say(ctx, CONTACT.closed(kept), buildAccessKeyboard({ open: false, draft: "" }));
  return true;
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

function setState(ctx: AppContext, open: boolean, text: string): void {
  if (!ctx.user) return;
  ctx.user.admin_dialog_open = open ? 1 : 0;
  ctx.user.admin_dialog_text = text;
  ctx.userDirty = true;
}

async function say(
  ctx: AppContext,
  text: string,
  keyboard?: ReturnType<typeof buildContactKeyboard>,
): Promise<void> {
  if (!ctx.chat?.id) return;
  try {
    await ctx.api.sendMessage(ctx.chat.id, text, keyboard ? { reply_markup: keyboard } : undefined);
  } catch (err) {
    log("ACCESS", "contact message failed", { error: String(err) });
  }
}
