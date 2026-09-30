export interface BotUser {
  user_id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language?: string;
  is_blocked?: number;
  rate_limit_json?: string;
  active_scenario?: string | null;
  message_id?: number;
  my_dates?: string;
  /**
   * Хто запросив людину (`users.user_id`); `null` — ніхто, і тоді бот закритий
   * для неї (див. `bot-dev/src/modules/access`).
   */
  inviter_id?: number | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}
