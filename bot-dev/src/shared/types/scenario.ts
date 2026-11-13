/**
 * Сценарій бота: один `lookup` — один екран.
 *
 * `kind` каже, чим екран показується: `widget` (HTML у повідомленні, лише
 * приватний чат) або `rich` (HTML із кнопками в тілі, для службових екранів і
 * груп). Стан віджета зберігається окремо — `bot_widget_messages`.
 *
 * @module bot-dev/src/shared/types/scenario
 */

export type ScenarioKind = "widget" | "rich";

export interface BotScenario {
  id: number;
  /** Ключ пошуку як отримано: `/start`, callback-data, діплінк або текст. */
  lookup: string;
  kind: ScenarioKind;
  widget_html: string | null;
  /** Початковий `chat_data` віджета. */
  widget_data: string | null;
  rich_html: string | null;
  notify_groups: string | null;
  notify_template: string | null;
}

/** Де в чаті лежить поточний віджет людини і який вид у ньому відкритий. */
export interface WidgetMessageState {
  message_id: number;
  widget_id: string | null;
  lookup: string;
  chat_data: string | null;
}

export interface ScenarioRow {
  id: number;
  lookup: string;
  kind: string;
  widget_html: string | null;
  widget_data: string | null;
  rich_html: string | null;
  notify_groups: string | null;
  notify_template: string | null;
}
