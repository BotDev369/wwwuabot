/**
 * Відмова для того, хто не запрошений.
 *
 * **Це не помилка, а відповідь.** Людина відкрила бота, до якого її не кликали:
 * сказати їй «сталася помилка» — значило б вигадати неправду, а промовчати —
 * лишити людину дивитись у порожнечу. Тому це окремий екран зі зрозумілим
 * текстом і без сценарію: контент сторінки тут недоречний, бо людина не має
 * жодного права його бачити.
 *
 * **Клавіатуру знімаємо.** На екрані відмови немає жодної дії, тож лишати під
 * чатом три кнопки, які ведуть у платформу, де її теж не чекають, — це
 * обіцянка, яку ми не зможемо виконати. `remove_keyboard` прибирає їх одразу.
 *
 * **Старий екран бота теж зникає.** Кнопка «Відкрити сторінку» — це `web_app`
 * прямо в повідомленні, і `remove_keyboard` її не торкається: лишається старий
 * екран із кнопкою, яка веде в платформу. Допуск на платформі тепер той самий,
 * тож відкриття нічого не дасть, але кнопка, яка обіцяє контент і не дає його,
 * — це брехня в інтерфейсі. Тому попереднє повідомлення бота видаляється тим
 * самим способом, яким видаляють старий екран під час рендеру (`screen.ts`),
 * а разом із ним зникає й кнопка. Telegram не дозволяє видаляти повідомлення
 * старші за 48 годин — це не помилка, а межа API, і тоді лишається текст без
 * кнопок, що вже краще за кнопку.
 *
 * @module bot-dev/src/modules/access/denied
 */

import type { AppContext } from "../../shared/types/env";
import { ACCESS_DENIED } from "../../shared/config/texts";
import { log } from "../../shared/utils/debug";

/**
 * Показати відмову й прибрати клавіатуру.
 *
 * `ctx.screen` навмисно **не** заповнюється: рендер екрана додав би до тексту
 * банер і кнопку «Відкрити сторінку», а це відмова, де сторінки немає.
 * Повідомлення надсилається напряму — так само, як текст помилки в `core/bot.ts`.
 */
export async function showAccessDenied(ctx: AppContext): Promise<void> {
  if (!ctx.chat?.id) return;

  await deletePreviousScreen(ctx);

  try {
    await ctx.api.sendMessage(ctx.chat.id, ACCESS_DENIED, {
      reply_markup: { remove_keyboard: true },
    });
    log("ACCESS", "denied | keyboard removed", { user_id: ctx.user?.user_id });
  } catch (err) {
    // Відмова не надіслалась — контент все одно не показано, тож це не
    // відкриває нічого; лог лишається, бо мовчазно зникла б відмова.
    log("ACCESS", "failed to send denial", { error: String(err) });
  }
}

/**
 * Прибрати попередній екран бота — разом із його `web_app`-кнопками.
 *
 * `ctx.user.message_id` — це номер останнього повідомлення, яке бот надіслав
 * цій людині (`screen.ts` записує його після кожного рендеру), тож ми знаємо,
 * що саме треба знести. Помилка не критична: гірше за відсутність кнопки
 * нічого немає, а відмова вже надіслана.
 */
async function deletePreviousScreen(ctx: AppContext): Promise<void> {
  const chatId = ctx.chat?.id;
  const messageId = ctx.user?.message_id;
  if (!chatId || typeof messageId !== "number") return;

  try {
    await ctx.api.deleteMessage(chatId, messageId);
    ctx.user!.message_id = undefined;
    ctx.userDirty = true;
    log("ACCESS", "previous screen deleted", { message_id: messageId });
  } catch (err) {
    log("ACCESS", "failed to delete previous screen", { error: String(err) });
  }
}
