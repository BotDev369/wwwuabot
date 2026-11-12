-- Розділення `scenarios` на `platform_pages` і `bot_scenarios`.
--
-- Що було. Один рядок тримав дві різні речі: сторінку вебу (`page_data`,
-- `template_key`, видимість) і екран бота (`caption_*`, `buttons`, `rich_*`).
-- Через це кожна таблиця несла чужі колонки, а адмінка показувала ботові поля
-- в списку сторінок і навпаки.
--
-- Що тут.
--   1. Дві таблиці з тими полями, які належать кожній стороні. Зв'язок — `slug`:
--      адреса однакова для вебу й бота. Номери різні: `platform_pages.id`
--      лишається тим самим, що був у `scenarios` (на нього посилаються
--      `shop_orders.shop_id` і `favorites.target_id`), `bot_scenarios.id` — новий.
--   2. Перенос усіх рядків: сторінка — завжди, екран бота — коли в рядку є хоч
--      щось ботове (підпис, фото, кнопки, rich-розмітка, очікування вводу).
--      Сторінка без екрана теж рендериться в боті — універсальною карткою.
--   3. Стара таблиця перейменовується в `scenarios_legacy_20261112`, а не
--      видаляється: це копія на випадок, якщо перенос десь схибив.
--
-- Ідемпотентність: `IF NOT EXISTS` для таблиць, `INSERT OR IGNORE` для рядків,
-- перейменування — лише коли `scenarios` ще існує. Повторний прогін нічого не
-- ламає й не дублює.

CREATE TABLE IF NOT EXISTS "platform_pages" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT,
  photo_url TEXT,
  page_data TEXT DEFAULT NULL,
  template_key TEXT,
  owner_id TEXT,
  admin_ids TEXT,
  is_public INTEGER DEFAULT 0,
  viewer_ids TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "bot_scenarios" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  bot_command TEXT,
  photo_url TEXT,
  caption_top TEXT,
  caption_mid TEXT,
  caption_bot TEXT,
  keyboard_type TEXT NOT NULL DEFAULT 'static',
  buttons TEXT NOT NULL DEFAULT '[]',
  awaits_input TEXT,
  input_path TEXT,
  input_next TEXT,
  price TEXT,
  qty_options TEXT,
  notify_groups TEXT,
  notify_template TEXT,
  rich_message TEXT,
  rich_data TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO platform_pages (
  id, slug, title, photo_url, page_data, template_key,
  owner_id, admin_ids, is_public, viewer_ids, is_active, created_at, updated_at
)
SELECT
  id, slug, title, photo_url, page_data, template_key,
  owner_id, admin_ids, is_public, viewer_ids, is_active, created_at, updated_at
FROM scenarios;

INSERT OR IGNORE INTO bot_scenarios (
  slug, bot_command, photo_url, caption_top, caption_mid, caption_bot,
  keyboard_type, buttons, awaits_input, input_path, input_next, price,
  qty_options, notify_groups, notify_template, rich_message, rich_data,
  is_active, created_at, updated_at
)
SELECT
  slug, bot_command, photo_url, caption_top, caption_mid, caption_bot,
  keyboard_type, buttons, awaits_input, input_path, input_next, price,
  qty_options, notify_groups, notify_template, rich_message, rich_data,
  is_active, created_at, updated_at
FROM scenarios
WHERE trim(COALESCE(caption_top, '')) <> ''
   OR trim(COALESCE(caption_mid, '')) <> ''
   OR trim(COALESCE(caption_bot, '')) <> ''
   OR trim(COALESCE(photo_url, '')) <> ''
   OR trim(COALESCE(rich_data, '')) <> ''
   OR trim(COALESCE(awaits_input, '')) <> ''
   OR (COALESCE(buttons, '[]') NOT IN ('', '[]'));

ALTER TABLE "scenarios" RENAME TO "scenarios_legacy_20261112";
