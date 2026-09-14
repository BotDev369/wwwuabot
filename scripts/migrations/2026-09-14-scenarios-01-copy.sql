-- ═════════════════════════════════════════════════════════════════════════════
-- Міграція `scenarios`: номер рядка + адреса з UNIQUE — крок 1 з 2.
-- Дата: 14.09.2026 · База: wwwuabot-db-dev · Застосовується двічі окремо
-- (спершу цей файл, перевірка, потім 2026-09-14-scenarios-02-swap.sql).
--
-- НАВІЩО. `slug` був адресою **і** первинним ключем одночасно: щоб змінити
-- адресу, не було за що зачепитись — рядок шукали за тим самим значенням, яке
-- хотіли змінити (у старій таблиці PK — `codeword`, а `slug` узагалі без
-- унікальності, тому адмінський `ON CONFLICT(slug)` падав із «does not match
-- any PRIMARY KEY or UNIQUE constraint»). Тепер ідентичність — номер (`id`),
-- адреса — `slug` з `UNIQUE`.
--
-- ЧОМУ НЕ `ensureTables`. Він **тільки додає** колонки (`ALTER TABLE … ADD
-- COLUMN`) і не здатен зробити PK/UNIQUE: на наявній таблиці новий PK просто
-- не з'явиться, а схема мовчки лишиться старою. Тому це окремий крок, а не
-- код воркера — як і написано в `docs/DATA_MODEL.md`.
--
-- ПРАВИЛО АДРЕСИ — те саме, що в коді (`shared/content/resolve.ts`): шлях вебу
-- і payload бота — це одна адреса з різним розділювачем, тому
-- `slug = codeword` з `_` → `/` у нижньому регістрі. Хвіст (`…_today`) — це
-- параметри сторінки, а не інший рядок, тому нових рядків він не створює.
--
-- ЩО ЦЕЙ ФАЙЛ РОБИТЬ: **тільки створює й додає**. Стару таблицю не чіпає
-- взагалі — тому порядок і такий: нову таблицю створюємо, доки ім'я
-- `scenarios` зайняте старою, тоді автоіндекси SQLite отримують імена від
-- `scenarios_new` і після перейменування (крок 2) збігу імен не виникає.
--
-- ЩО ПРОПУСКАЄТЬСЯ (і чому це видно нижче):
--   • рядок без `codeword` — сміттєвий рядок від `ensureBase` (порожній, без
--     контенту): домашня сторінка — це рядок `__base__`, він переноситься
--     окремо з адресою `''`;
--   • `codeword`, який не складається з дозволених сегментів (`_` — розділювач,
--     тому порожній сегмент, дефіс на краю або подвійний дефіс роблять адресу
--     неоднозначною);
--   • дублікат адреси після зниження регістру (`richTest`/`richtest`,
--     `richtestAstragal`/`richtestastragal`) — лишається той рядок, чий
--     `codeword` уже був у нижньому регістрі (див. `ORDER BY`).
-- Скільки саме пропущено — видно з порівняння `COUNT(*)` двох таблиць; звіт
-- про конкретні рядки — у `docs/DATA_MODEL.md`.
--
-- DDL — копія оголошення з реєстру (`packages/shared/src/database/tables.ts`)
-- на 14.09.2026. Джерело правди про схему — реєстр; це історичний запис
-- застосованої міграції, а не друга правда.
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "scenarios_new" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  caption_top TEXT,
  caption_mid TEXT,
  caption_bot TEXT,
  keyboard_type TEXT NOT NULL DEFAULT 'static',
  buttons TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  price TEXT,
  qty_options TEXT,
  awaits_input TEXT,
  input_path TEXT,
  input_next TEXT,
  title TEXT,
  notify_groups TEXT,
  notify_template TEXT,
  rich_message TEXT,
  rich_data TEXT,
  page_data TEXT DEFAULT NULL,
  is_active INTEGER DEFAULT 1
);

-- ── 1. Домашня сторінка: `__base__` → порожня адреса ────────────────────────
-- Порожній `slug` — це головна (`HOME_SLUG` в `resolve.ts`), саме його створює
-- `ensureBase`. У старій схемі головна звалася `__base__`, і розділювач `_`
-- зробив би з неї адресу `base` — тобто іншу сторінку.
INSERT INTO "scenarios_new" (
  slug, photo_url, caption_top, caption_mid, caption_bot, keyboard_type, buttons,
  created_at, updated_at, price, qty_options, awaits_input, input_path, input_next,
  title, notify_groups, notify_template, rich_message, rich_data, page_data, is_active
)
SELECT
  '', photo_url, caption_top, caption_mid, caption_bot,
  COALESCE(keyboard_type, 'static'), COALESCE(buttons, '[]'),
  COALESCE(created_at, datetime('now')), COALESCE(updated_at, datetime('now')),
  price, qty_options, awaits_input, input_path, input_next, title, notify_groups,
  notify_template, rich_message, rich_data,
  -- `web_config` — стара колонка того самого контенту, яку досі розуміє
  -- `parsePageConfig` (формат `{v:1, slots:{…}}`). Її вміст переносимо туди,
  -- де йому місце: у `page_data`; якщо там уже щось є — лишається воно.
  COALESCE(NULLIF(page_data, ''), NULLIF(web_config, '')),
  COALESCE(is_active, 1)
FROM "scenarios"
WHERE codeword = '__base__';

-- ── 2. Решта рядків: адреса = codeword із `_` → `/` ─────────────────────────
-- `ORDER BY` обирає переможця при дублікаті адреси: першим іде той рядок, чий
-- `codeword` уже записаний у нижньому регістрі, тобто канонічний. `INSERT OR
-- IGNORE` пропускає другий — мовчки, тому звіт про пропущені береться з
-- різниці кількості рядків.
INSERT OR IGNORE INTO "scenarios_new" (
  slug, photo_url, caption_top, caption_mid, caption_bot, keyboard_type, buttons,
  created_at, updated_at, price, qty_options, awaits_input, input_path, input_next,
  title, notify_groups, notify_template, rich_message, rich_data, page_data, is_active
)
SELECT
  replace(replace(replace(replace(trim(lower(codeword)), '_', '/'), '//', '/'), '//', '/'), '//', '/'),
  photo_url, caption_top, caption_mid, caption_bot,
  COALESCE(keyboard_type, 'static'), COALESCE(buttons, '[]'),
  COALESCE(created_at, datetime('now')), COALESCE(updated_at, datetime('now')),
  price, qty_options, awaits_input, input_path, input_next, title, notify_groups,
  notify_template, rich_message, rich_data,
  COALESCE(NULLIF(page_data, ''), NULLIF(web_config, '')),
  COALESCE(is_active, 1)
FROM "scenarios"
WHERE codeword IS NOT NULL
  AND trim(codeword) <> ''
  AND lower(trim(codeword)) <> '__base__'
  -- Лише символи, з яких `isValidSlug` складає сегмент.
  AND lower(trim(codeword)) NOT GLOB '*[^a-z0-9_-]*'
  -- Порожній сегмент (провідний, кінцевий або подвійний розділювач).
  AND lower(trim(codeword)) NOT GLOB '_*'
  AND lower(trim(codeword)) NOT GLOB '*_'
  AND lower(trim(codeword)) NOT GLOB '*__*'
  -- Дефіс на краю сегмента (`SEGMENT_RE`: `[a-z0-9]+(-[a-z0-9]+)*`).
  AND lower(trim(codeword)) NOT GLOB '-*'
  AND lower(trim(codeword)) NOT GLOB '*-'
  AND lower(trim(codeword)) NOT GLOB '*_-*'
  AND lower(trim(codeword)) NOT GLOB '*-_*'
  AND lower(trim(codeword)) NOT GLOB '*--*'
ORDER BY CASE WHEN codeword = lower(codeword) THEN 0 ELSE 1 END, codeword;
