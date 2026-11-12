-- 12.11.2026 — бот переходить на Bot API 10.4 (віджети).
--
-- Старі сценарії видаляються повністю: у них немає нічого, що переносилось би
-- (підписи, фото, клавіатури й rich-блоки замінені одним HTML-документом).
-- Таблиця перебудовується, а не змінюється: SQLite не вміє змінювати CHECK і
-- прибирати колонки, а старий DDL у `ensureTables` лише додає стовпці.

DROP TABLE IF EXISTS "bot_scenarios";

CREATE TABLE "bot_scenarios" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lookup TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('widget', 'rich')),
  caption TEXT,
  widget_html TEXT,
  widget_data TEXT,
  rich_html TEXT,
  notify_groups TEXT,
  notify_template TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (kind = 'widget' AND widget_html IS NOT NULL AND length(trim(widget_html)) > 0)
    OR
    (kind = 'rich' AND rich_html IS NOT NULL AND length(trim(rich_html)) > 0)
  )
);

CREATE TABLE IF NOT EXISTS "bot_widget_messages" (
  user_id INTEGER PRIMARY KEY,
  message_id INTEGER NOT NULL,
  widget_id TEXT,
  lookup TEXT NOT NULL,
  chat_data TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
