/**
 * Екран запрошення — те, що бачить людина, яка прийшла за особистим лінком.
 *
 * **Чому це не рядок `scenarios`.** Текст вітання мусить називати того, хто
 * запросив, а ім'я приходить із бази в момент переходу — у контенті його немає й
 * бути не може. Тому екран складається тут, як і будь-яка відповідь на подію, а
 * не як сторінка з редактора.
 *
 * **Ім'я береться спільним ланцюгом підписів** (`peerPublicLabel`): людина
 * мусить зватися однаково й у боті, і в розмові на платформі. Друга копія
 * правила «як назвати людину» розійшлася б із першою — і та сама особа мала б
 * два імені в одному продукті.
 *
 * **Кнопка веде одразу в розмову** (`messagesPeerPath`): людина натиснула
 * «запрошую», і найкоротший шлях до мети — сама переписка, а не список, у
 * якому треба ще щось шукати.
 *
 * **Без адреси платформи екрана немає.** `WEB_PLATFORM_URL` не заданий — отже,
 * кнопку скласти нічим, і вітання без єдиної дії було б глухим кутом: краще
 * показати головну, як було раніше.
 *
 * @module bot-dev/src/modules/contacts
 */

import { messagesPeerPath, peerPublicLabel, type MessagePeer } from "@wwwuabot/shared/messages";
import type { AppContext, ScreenState } from "../../shared/types/env";
import { INVITE_BUTTON, INVITE_GREETING } from "../../shared/config/texts";
import { log } from "../../shared/utils/debug";
import { buildWebAppUrl } from "../../shared/utils/screen";
import { getPhoto } from "../../shared/utils/photo";
import { escapeHtml } from "../security/input-validation";

/**
 * Те, що про людину треба знати, щоб її назвати.
 *
 * Читаємо перелічені колонки, а не `SELECT *`: у `users` лежить `telegram_json`
 * — важка колонка, і тягнути її заради імені означало б платити за неї на
 * кожному переході за лінком (AGENTS.md §7).
 */
interface InviterRow {
  user_id: number;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  platform_username: string | null;
}

/** Людина з бази у вигляді, який приймає спільне правило підпису. */
async function readInviter(ctx: AppContext, userId: number): Promise<InviterRow | null> {
  return ctx.env.DB.prepare(
    `SELECT user_id, first_name, last_name, username, platform_username
       FROM users WHERE user_id = ?`,
  )
    .bind(userId)
    .first<InviterRow>();
}

/** Рядок `users` у формі спільного `MessagePeer` — самі лише імена. */
function toPeer(row: InviterRow | null, userId: number): MessagePeer {
  return {
    id: row?.user_id ?? userId,
    firstName: row?.first_name ?? null,
    lastName: row?.last_name ?? null,
    username: row?.username ?? null,
    platformUsername: row?.platform_username ?? null,
    // Довідник належить тому, хто дивиться, і його тут немає: ім'я в спільному
    // тексті береться публічне (див. `peerPublicLabel`).
    contactName: null,
    photoUrl: null,
  };
}

/**
 * Показати вітання тому, кого запросив `ownerId`.
 *
 * Якщо екран скласти не вдалося (немає адреси платформи), повертає `false` — і
 * роутер показує головну, тобто поводиться так, як до появи цього екрана.
 */
export async function showInviteScreen(ctx: AppContext, ownerId: number): Promise<boolean> {
  const chatUrl = buildWebAppUrl(ctx.env.WEB_PLATFORM_URL, messagesPeerPath(ownerId));
  if (!chatUrl) {
    log("INVITE", "no platform url | falling back to home", { owner_id: ownerId });
    return false;
  }

  // `null` — людини немає в базі: вітання тоді обходиться без імені, а не
  // називає її «Невідомим» (ті самі слова вже написані в `texts.ts`).
  let name: string | null = null;
  try {
    const inviter = await readInviter(ctx, ownerId);
    name = inviter ? peerPublicLabel(toPeer(inviter, ownerId)) : null;
  } catch (e: unknown) {
    // База недоступна — показуємо вітання без імені: дія цього екрана не ім'я,
    // а кнопка, і вона складена ще до звернення до бази.
    log("INVITE", "inviter lookup failed", { owner_id: ownerId, error: String(e) });
  }

  // Банер беремо той самий, що й на головній: він сталий (без імені в тексті),
  // а отже не залежить від того, чи намалює Cloudinary кирилицю.
  const screen: ScreenState = {
    // Це не адреса контенту: рядка з таким `slug` у `scenarios` немає й мусить
    // не бути. Значення потрібне рендеру (банер і лог) і нікуди не записується.
    slug: "invite",
    photo_url: await getPhoto("", null, ctx.env),
    caption: { top: INVITE_GREETING(name === null ? null : escapeHtml(name)) },
    buttons: [[{ text: INVITE_BUTTON, web_app: { url: chatUrl } }]],
    // `web_path` не задаємо навмисно: інакше рендер додав би другу кнопку
    // («Відкрити сторінку») на той самий екран — тут дія одна.
    rich_message: false,
  };

  ctx.screen = screen;
  log("INVITE", "invitation screen shown", { owner_id: ownerId, chat_url: chatUrl });
  return true;
}
