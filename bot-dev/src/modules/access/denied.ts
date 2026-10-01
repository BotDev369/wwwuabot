/**
 * Відмова для того, хто не запрошений.
 *
 * **Це не помилка, а відповідь.** Людина відкрила бота, до якого її не кликали:
 * сказати їй «сталася помилка» — значило б вигадати неправду, а промовчати —
 * лишити людину дивитись у порожнечу. Тому це окремий екран зі зрозумілим
 * текстом і без сценарію: контент сторінки тут недоречний, бо людина не має
 * жодного права його бачити.
 *
 * **Клавіатуру міняємо на одну кнопку.** Кнопки платформи (`Профіль`, `Обране`,
 * `Простір`) тут не працюють — доступу все одно немає, — тож лишати їх означало
 * б обіцянку, яку ми не виконаємо. Натомість під чатом з'являється «Написати
 * адміну»: це єдина дія, яка в людини тут є (див. `access/contact`). Клавіатура
 * реплай-п��ится сама, а не живе на екрані, тож зносом екрана вона не
 * зникає.
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
import { buildAccessKeyboard, readContactState } from "./contact/state";

/**
 * Показати відмову й поставити під чатом кнопку зв'язку з адміном.
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
      // Відкритий діалог лишає ту клавіатуру, на якій людина вже стояла:
      // `/start` посеред написаного не має її збивати.
      reply_markup: buildAccessKeyboard(readContactState(ctx.user)),
    });

    // Відмова стає «поточним екраном»: наступна відмова замінить її, а не
    // доліпить другу таку саму. Те саме поле пише рендер сторінки.
    if (ctx.user) {
      ctx.user.message_id = sent.message_id;
      ctx.userDirty = true;
    }
    log("ACCESS", "denied | contact button shown", { user_id: ctx.user?.user_id });
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
