/**
 * Постійна клавіатура під чатом — три екрани платформи, які людина відкриває
 * найчастіше.
 *
 * **Чому `web_app`, а не inline-кнопки.** Інлайнові живуть на повідомленні й
 * зникають разом із ним; реплай-клавіатура лишається під чатом, тож наступний
 * екран — один тап. `is_persistent` просить Telegram не ховати її, коли вона
 * застаріла: інакше клавіатура зникла б сама через кілька днів тиші, і людина
 * не знала б, як повернутися.
 *
 * **Адреси — спільні.** Три шляхи нижче узяті з `@wwwuabot/shared/app/routes`:
 * платформа читає ті ж літерали в `app/routes.ts`, і другий список розійшовся б
 * тихо — кнопка відкрила б 404, і ніщо б про це не сказало.
 *
 * **Без адреси платформи клавіатури немає.** `WEB_PLATFORM_URL` не заданий —
 * тоді `web_app` немає чим наповнити, а кнопки без адреси Telegram не приймає.
 * Тому функція повертає `null`, і виклик просто нічого не надсилає.
 *
 * @module bot-dev/src/modules/access/keyboard
 */

import { FAVORITES_PATH, PROFILE_PATH, SPACE_PATH } from "@wwwuabot/shared/app/routes";
import type { AppContext } from "../../shared/types/env";
import { KEYBOARD_BUTTONS } from "../../shared/config/texts";
import { buildWebAppUrl } from "../../shared/utils/screen";
import type { ReplyKeyboardMarkup } from "grammy/types";

/**
 * Три кнопки в порядку, у якому їх відкривають: спершу себе, потім збережене,
 * потім інших людей.
 */
const TARGETS: readonly { label: string; path: string }[] = [
  { label: KEYBOARD_BUTTONS.profile, path: PROFILE_PATH },
  { label: KEYBOARD_BUTTONS.favorites, path: FAVORITES_PATH },
  { label: KEYBOARD_BUTTONS.space, path: SPACE_PATH },
];

/**
 * Клавіатура для цього воркера, або `null`, якщо немає чим наповнити кнопки.
 *
 * Чиста функція від Telegram: її можна перевірити тестом без мережі, і вона
 * нічого не надсилає — надсилає виклик.
 */
export function buildMainKeyboard(webPlatformUrl: string | undefined): ReplyKeyboardMarkup | null {
  const row = TARGETS.map(({ label, path }) => {
    const url = buildWebAppUrl(webPlatformUrl, path);
    return url ? { text: label, web_app: { url } } : null;
  });

  // Одна відсутня адреса робить усі кнопки без адреси: Telegram не приймає
  // такий рядок, тож краще не надсилати нічого, ніж напівробочу клавіатуру.
  if (row.some((button) => button === null)) return null;

  return {
    keyboard: [row as { text: string; web_app: { url: string } }[]],
    is_persistent: true,
    resize_keyboard: true,
  };
}

/**
 * Показати клавіатуру людині, якій вона належить.
 *
 * `false` — надсилати не варто (немає адреси платформи або чату); виклик на це
 * йде далі, а не зупиняється: відмовити людину через те, що клавіатура
 * не відправилась, — це неприємно й не потрібно.
 */
export async function showMainKeyboard(ctx: AppContext): Promise<boolean> {
  const keyboard = buildMainKeyboard(ctx.env.WEB_PLATFORM_URL);
  if (!keyboard || !ctx.chat?.id) return false;

  try {
    await ctx.api.sendMessage(ctx.chat.id, KEYBOARD_BUTTONS.hint, { reply_markup: keyboard });
    return true;
  } catch {
    // Клавіатура — зручність, а не умова доступу: її невдача не мусить
    // відміняти показ екрана.
    return false;
  }
}
