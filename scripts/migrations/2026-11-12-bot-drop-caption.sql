-- 12.11.2026 — прибираємо підпис під віджетом.
--
-- Він дублював те, що вже написано в самому HTML, і на старих клієнтах ставав
-- єдиним, що видно. Таблиця перебудовується: так само, як у першій міграції
-- віджетів, щоб DDL у `ensureTables` і реальна схема не розходились.

CREATE TABLE "bot_scenarios_new" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  lookup TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('widget', 'rich')),
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

INSERT INTO "bot_scenarios_new"
  (id, lookup, kind, widget_html, widget_data, rich_html,
   notify_groups, notify_template, is_active, created_at, updated_at)
SELECT id, lookup, kind, widget_html, widget_data, rich_html,
       notify_groups, notify_template, is_active, created_at, updated_at
  FROM "bot_scenarios";

DROP TABLE "bot_scenarios";
ALTER TABLE "bot_scenarios_new" RENAME TO "bot_scenarios";
