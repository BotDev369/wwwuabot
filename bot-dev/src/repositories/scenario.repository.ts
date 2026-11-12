/**
 * Читання сценаріїв бота за єдиним ключем `lookup`.
 *
 * Жодного JOIN зі сторінками платформи: `/start` — це сценарій бота, а не
 * головна сторінка вебу. Ключ шукається точно, як його віддав Telegram.
 *
 * @module bot-dev/src/repositories/scenario.repository
 */

import { DatabaseRepository } from "../core/database.repository";
import type { BotScenario, ScenarioKind, ScenarioRow } from "../shared/types/scenario";

function kindOf(value: string): ScenarioKind {
  return value === "rich" ? "rich" : "widget";
}

export class ScenarioRepository extends DatabaseRepository {
  async findByLookup(lookup: string): Promise<BotScenario | null> {
    const row = await this.db
      .prepare(
        `SELECT id, lookup, kind, caption, widget_html, widget_data, rich_html,
                notify_groups, notify_template
           FROM bot_scenarios
          WHERE lookup = ? AND is_active = 1`,
      )
      .bind(lookup)
      .first<ScenarioRow>();
    if (!row) return null;
    return {
      id: row.id,
      lookup: row.lookup,
      kind: kindOf(row.kind),
      caption: row.caption,
      widget_html: row.widget_html,
      widget_data: row.widget_data,
      rich_html: row.rich_html,
      notify_groups: row.notify_groups,
      notify_template: row.notify_template,
    };
  }

  /** Запам'ятати повідомлення-віджет, щоб наступний тап знав його координати. */
  async saveMessageState(
    userId: number,
    messageId: number,
    widgetId: string | null,
    lookup: string,
    chatData: string | null,
  ): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO bot_widget_messages (user_id, message_id, widget_id, lookup, chat_data, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(user_id) DO UPDATE SET
           message_id = excluded.message_id,
           widget_id = excluded.widget_id,
           lookup = excluded.lookup,
           chat_data = excluded.chat_data,
           updated_at = excluded.updated_at`,
      )
      .bind(userId, messageId, widgetId, lookup, chatData)
      .run();
  }
}
