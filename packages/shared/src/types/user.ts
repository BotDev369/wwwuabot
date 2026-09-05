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
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}
