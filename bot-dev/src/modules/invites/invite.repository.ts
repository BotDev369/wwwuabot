/**
 * Лінк-запрошення з боку бота.
 *
 * Бот тут не «друге сховище», а **єдине місце, де народжується факт
 * приєднання**: людина приходить із `?start=<код>`, і закріпити її за власником
 * лінка може лише той, хто цей перехід побачив. Лінки створює платформа
 * (`api-dev`) — тому це читання чужого запису, і воно нічого в ньому не
 * переписує, крім двох порожніх колонок.
 *
 * **Закріплення — один раз і назавжди.** `invited_user_id IS NULL` стоїть у
 * самому `WHERE`: лінк персональний, і другий, хто за ним прийде, контакту вже
 * не додасть. Зробити це окремою перевіркою «а вільний він?» — те саме, що
 * загубити її на наступному шляху, і двоє людей закріпилися б за одним лінком
 * навперебій.
 *
 * @module bot-dev/src/modules/invites
 */

import { DatabaseRepository } from "../../core/database.repository";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import { isInviteCode } from "@wwwuabot/shared/invites";

/** Рівно те, що потрібно, щоб вирішити долю переходу. */
export interface InviteRecord {
  id: number;
  owner_id: number;
  invited_user_id: number | null;
}

export class InviteRepository extends DatabaseRepository {
  /**
   * Лінк за кодом із `?start=`.
   *
   * Код перевіряється **до** бази: адреса сторінки теж проходить
   * `isValidBotPayload`, тож без цієї межі кожен `/start mydate` робив би
   * зайвий запит. `ensureTables` тут — тому що бот пише першим: людина
   * відкриває бота раніше, ніж платформа встигає створити таблицю.
   */
  async findByCode(rawCode: string): Promise<InviteRecord | null> {
    if (!isInviteCode(rawCode)) return null;

    await ensureTables(this.db, ["invites"]);
    const row = await this.db
      .prepare("SELECT id, owner_id, invited_user_id FROM invites WHERE code = ?")
      .bind(rawCode.trim().toLowerCase())
      .first<InviteRecord>();
    return row ?? null;
  }

  /** Закріплює контакт за власником лінка; `false` — лінк уже когось закріпив. */
  async attachContact(id: number, userId: number): Promise<boolean> {
    const now = formatSqliteDatetime();
    const result = await this.db
      .prepare(
        "UPDATE invites SET invited_user_id = ?, invited_at = ?, updated_at = ? WHERE id = ? AND invited_user_id IS NULL",
      )
      .bind(userId, now, now, id)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }
}
