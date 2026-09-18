/**
 * Контакт із боку бота — місце, де народжується факт приєднання.
 *
 * Бот тут не «друге сховище», а **єдине місце, яке бачить перехід**: людина
 * приходить із `?start=<код>`, і закріпити її за власником лінка може лише
 * той, хто цей перехід побачив. Контакти створює й показує платформа
 * (`api-dev`) — тому це читання чужого запису, і воно нічого в ньому не
 * переписує, крім трьох порожніх колонок.
 *
 * **Закріплення — один раз і назавжди.** `joined_bot_at IS NULL` стоїть у
 * самому `WHERE`: код персональний, і другий, хто за ним прийде, контакт уже
 * не змінить. Зробити це окремою перевіркою «а вільний він?» — те саме, що
 * загубити її на наступному шляху, і двоє людей закріпилися б за одним
 * контактом навперебій.
 *
 * **Це лише вхід у бота.** Повне приєднання стається на платформі, і його
 * фіксує `api-dev` (`joined_platform_at`): людина може зайти в бота й не
 * відкрити Mini App. Бот не ставить другої дати навіть тоді, коли показує
 * кнопку «Відкрити сторінку» — він не бачить, чи по ній натиснули.
 *
 * `username` заповнюється **лише якщо його ще немає** (`COALESCE`): власник міг
 * вписати хендл сам, і перехід не має права переписати те, що людина написала
 * про людину.
 *
 * @module bot-dev/src/modules/contacts
 */

import { DatabaseRepository } from "../../core/database.repository";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import { isInviteCode, sanitizeContactUsername } from "@wwwuabot/shared/contacts";

/** Рівно те, що потрібно, щоб вирішити долю переходу. */
export interface ContactRecord {
  id: number;
  owner_id: number;
  joined_user_id: number | null;
}

export class ContactRepository extends DatabaseRepository {
  /**
   * Контакт за кодом із `?start=`.
   *
   * Код перевіряється **до** бази: адреса сторінки теж проходить
   * `isValidBotPayload`, тож без цієї межі кожен `/start mydate` робив би
   * зайвий запит. `ensureTables` тут — тому що бот пише першим: людина
   * відкриває бота раніше, ніж платформа встигає створити таблицю.
   */
  async findByCode(rawCode: string): Promise<ContactRecord | null> {
    if (!isInviteCode(rawCode)) return null;

    await ensureTables(this.db, ["contacts"]);
    const row = await this.db
      .prepare("SELECT id, owner_id, joined_user_id FROM contacts WHERE code = ?")
      .bind(rawCode.trim().toLowerCase())
      .first<ContactRecord>();
    return row ?? null;
  }

  /** Закріплює людину за контактом; `false` — контакт уже когось закріпив. */
  async attach(id: number, userId: number, username: string | null): Promise<boolean> {
    const now = formatSqliteDatetime();
    const result = await this.db
      .prepare(
        `UPDATE contacts SET joined_user_id = ?, joined_bot_at = ?,
           username = COALESCE(NULLIF(username, ''), ?), updated_at = ?
         WHERE id = ? AND joined_bot_at IS NULL`,
      )
      .bind(userId, now, sanitizeContactUsername(username), now, id)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }
}
