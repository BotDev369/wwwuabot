-- Переписка людини з ботом: обидва боки розмови в одній таблиці.
--
-- Схема описана в `packages/shared/src/database/tables.ts` (`bot_messages`).
-- Цей файл лише створює її там, де `ensureTables` ще не писав: перший запис
-- бота створив би таблицю сам, але адмінка має читати переписку до нього.
--
-- `direction`: `in` — людина, `out` — бот. `message_id` — номер у Telegram.
-- `text` — те, що видно в адмінці (для rich — HTML екрана).

CREATE TABLE IF NOT EXISTS bot_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  chat_id INTEGER NOT NULL,
  direction TEXT NOT NULL,
  message_id INTEGER,
  kind TEXT NOT NULL DEFAULT 'text',
  text TEXT NOT NULL DEFAULT '',
  meta TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  edited_at TEXT,
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_bot_messages_user ON bot_messages(user_id, id);
