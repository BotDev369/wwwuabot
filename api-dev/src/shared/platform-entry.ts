/**
 * Вхід на платформу — момент, який бачить лише цей воркер.
 *
 * **Навіщо окремо від авторизації.** Підписаний `initData` приходить із кожним
 * запитом, але «людина зайшла на платформу» — подія **одна**: перший її запит
 * після входу в бота. Тому тут не перевірка ідентичності (вона в
 * `shared/identity.ts`), а відмітка часу для контактів, які приєдналися
 * частково: зайшли в бота й не відкрили платформу — це не те саме, що
 * приєдналися.
 *
 * **Чому саме тут, а не в контролері.* * Контролер знає свою тему («Нотатки»
 * чи «Контакти»), а вхід на платформу не належить жодній із них: людина
 * відкрила Mini App — і цього досить. Тому відмітка стоїть на вході воркера,
 * до маршрутизації.
 *
 * **Чому це не коштує запиту на кожен виклик.** Ідентичність перевіряється
 * (підпис — це єдина довіра тут), але сама відмітка пам'ятається на інстанс
 * воркера: `UPDATE` з `joined_platform_at IS NULL` іде рівно один раз на
 * людину за життя інстансу. Помилку ковтаємо навмисно — невдала відмітка часу
 * не має права зламати людині звичайний запит до платформи.
 *
 * @module api-dev/src/shared/platform-entry
 */

import type { Env } from "./types";
import { INIT_DATA_HEADER, verifyInitData } from "@wwwuabot/shared/security/telegram";
import { markPlatformEntry } from "../services/contacts.service";
import { apiLog } from "./logger";

/** Кому відмітку вже поставили в цьому інстансі воркера. */
const marked = new Set<number>();

/**
 * Відмітити вхід на платформу, якщо запит несе підписаний `initData`.
 *
 * Викликається з `ctx.waitUntil`, тож не затримує відповідь — але й не губиться
 * після неї (без `waitUntil` Cloudflare міг би вбити воркер разом із запитом).
 */
export async function markEntryFromRequest(request: Request, env: Env): Promise<void> {
  const initData = request.headers.get(INIT_DATA_HEADER);
  if (!initData || !env.BOT_TOKEN) return;

  const userId = await verifyInitData(initData, env.BOT_TOKEN);
  if (userId === null || marked.has(userId)) return;

  try {
    await markPlatformEntry(env, userId);
    marked.add(userId);
  } catch (e: unknown) {
    // Інстанс не запам'ятовує невдачу — наступний запит спробує ще раз.
    apiLog.error("Platform entry mark failed", e);
  }
}
