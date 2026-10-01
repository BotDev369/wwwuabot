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
 * екран із кнопкою, яка веде в платформу. Допуск на платформі той самий, тож
 * відкриття нічого не дасть, але кнопка, яка обіцяє контент і не дає його, —
 * це брехня в інтерфейсі. Тому зносяться **усі** екрани, через які можна
 * було прийти: той, з якого прийшла кнопка (`callback_query.message`), і той,
 * що бот надіслав останнім (`users.message_id`). Telegram не дозволяє
 * видаляти повідомлення старші за 48 годин — це межа API, тоді лишається
 * текст без кнопок, що вже краще за кнопку.
 *
 * **Відмова не дублюється.** Людина може натиснути кнопку на старому екрані
 * або повторити `/start` — і щоразу ми не надсилаємо новий текст, а замінюємо
 * попередній: `ctx.user.message_id` після відмови веде на неї саму. Інакше в
 * чаті копиться стос «Платформа — за запрошеннями» — те саме, що ми щойно
 * видалили з його екрана.
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

  await deletePreviousScreens(ctx);

  try {
    const sent = await ctx.api.sendMessage(ctx.chat.id, ACCESS_DENIED, {
      reply_markup: { remove_keyboard: true },
    });

    // Відмова стає «поточним екраном»: наступна відмова замінить її, а не
    // доліпить другу таку саму. Те саме поле пише рендер сторінки.
    if (ctx.user) {
      ctx.user.message_id = sent.message_id;
      ctx.userDirty = true;
    }
    log("ACCESS", "denied | keyboard removed", { user_id: ctx.user?.user_id });
  } catch (err) {
    // Відмова не надіслалась — контент все одно не показано, тож це не
    // відкриває нічого; лог лишається, бо мовчазно зникла б відмова.
    log("ACCESS", "failed to send denial", { error: String(err) });
  }
}

/**
 * Знести екрани, з яких можна було прийти до платформи.
 *
 * Їх два, і це два різні номери: екран, з якого прийшла кнопка (Telegram
 * надсилає його в кожному `callback_query`), та останній екран бота, який
 * лежить у `users.message_id`. Обидва йдуть в один запит, бо видалення двох
 * повідомлень — це два платні виклики, а не «спробувати, поки не вийде».
 *
 * Помилка не критична: гірше за відсутність кнопки нічого немає, а відмова
 * вже надіслана.
 */
async function deletePreviousScreens(ctx: AppContext): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const ids = new Set<number>();
  if (typeof ctx.user?.message_id === "number") ids.add(ctx.user.message_id);
  const callbackMessageId = ctx.callbackQuery?.message?.message_id;
  if (typeof callbackMessageId === "number") ids.add(callbackMessageId);
  if (ids.size === 0) return;

  try {
    await (
      ctx.api as unknown as {
        raw: {
          deleteMessages: (params: { chat_id: number; message_ids: number[] }) => Promise<unknown>;
        };
      }
    ).raw.deleteMessages({ chat_id: chatId, message_ids: [...ids] });
    log("ACCESS", "previous screens deleted", { ids: [...ids] });
  } catch (err) {
    log("ACCESS", "failed to delete previous screens", { error: String(err) });
  }
}
