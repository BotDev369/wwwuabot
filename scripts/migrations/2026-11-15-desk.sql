-- 15.11.2026 — «Стіл»: спільний простір двох сторін.
--
-- Чотири таблиці, бо це чотири різні речі: тема (одиниця розмови), запис
-- (рядок у стрічці), файл (облік байтів, які лежать у R2) і прочитане
-- (до якого запису сторона вичитала тему). DDL стоїть у реєстрі
-- `packages/shared/src/database/tables.ts`; цей файл — слід для живої бази,
-- тож кожен `CREATE` нижче дублює реєстр один-в-один.
--
-- `turn` — рішення, а не висновок: «чия черга» перемикає сторона, і нотатка
-- не має перекидати хід. `tags` — JSON-масив (як `notes.tags`), `group_key` —
-- ключ, а не підпис. Файли: спершу рядок, потім об'єкт — сирітський файл
-- дешевший за рядок без файлу, а автоматичного прибирання тут немає.

CREATE TABLE IF NOT EXISTS desk_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_key TEXT NOT NULL DEFAULT 'plan',
  subgroup TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  turn TEXT NOT NULL DEFAULT 'none',
  tags TEXT NOT NULL DEFAULT '[]',
  due_at TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_entry_at TEXT NOT NULL DEFAULT (datetime('now')),
  archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_desk_threads_group ON desk_threads(group_key, status);
CREATE INDEX IF NOT EXISTS idx_desk_threads_turn ON desk_threads(turn, last_entry_at);
CREATE INDEX IF NOT EXISTS idx_desk_threads_last ON desk_threads(last_entry_at);

CREATE TABLE IF NOT EXISTS desk_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  author TEXT NOT NULL DEFAULT 'serhii',
  kind TEXT NOT NULL DEFAULT 'note',
  body TEXT NOT NULL DEFAULT '',
  meta TEXT NOT NULL DEFAULT '{}',
  reply_to INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  edited_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_desk_entries_thread ON desk_entries(thread_id, id);

CREATE TABLE IF NOT EXISTS desk_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL,
  entry_id INTEGER,
  author TEXT NOT NULL DEFAULT 'serhii',
  name TEXT NOT NULL,
  mime TEXT NOT NULL DEFAULT '',
  bytes INTEGER NOT NULL DEFAULT 0,
  r2_key TEXT NOT NULL UNIQUE,
  sha256 TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_desk_files_thread ON desk_files(thread_id, id);
CREATE INDEX IF NOT EXISTS idx_desk_files_entry ON desk_files(entry_id);

CREATE TABLE IF NOT EXISTS desk_reads (
  side TEXT NOT NULL,
  thread_id INTEGER NOT NULL,
  last_seen_entry_id INTEGER NOT NULL DEFAULT 0,
  seen_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (side, thread_id)
);
