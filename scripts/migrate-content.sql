-- ─────────────────────────────────────────────────────────────────────────────
-- Контент в одну таблицю: scenarios + scenarios-admin + sites + site_pages → pages
--
-- **Навіщо.** Чотири таблиці описували те саме: сторінку контенту. `scenarios`
-- читали бот і платформа, `scenarios-admin` — ніхто (запис у нікуди),
-- `sites` + `site_pages` — друга реалізація того самого для вебу. Навігація
-- сайту при цьому жила ще й третім списком — `sites.settings.navigation`
-- дублював назви сторінок, які вже існували рядками в `site_pages`.
--
-- **Правила цього файлу.**
--   1. Він **тільки додає**. Жодного `DELETE`, `DROP` чи `UPDATE`: легасі-таблиці
--      лишаються недоторканими, тож відкат — це видалення рядків `pages`.
--   2. Він **ідемпотентний**: `id` детермінований (`sc:` / `sa:` / `site:` / `sp:`
--      + старий ключ), тому повторний запуск не створює дублів.
--   3. Він **не мовчить про конфлікти**. Рядок, який не пройшов перевірку,
--      лишається в легасі-таблиці, а `migrate-content.mjs` друкує його на ім'я
--      разом із причиною — рішення ухвалює власник, а не скрипт. Тихо
--      перезаписати чужий контент гірше, ніж не перенести його.
--   4. Таблицю `pages` створює **не** цей файл, а реєстр
--      (`packages/shared/src/database/tables.ts`) — саме тому тут немає
--      `CREATE TABLE`: DDL мусить жити в одному місці.
--
-- **Чому кожна інструкція починається з `WITH src AS (…)` і `ROW_NUMBER()`.**
-- Це не оздоба, а виправлення реальної вади. Підзапит `NOT EXISTS` всередині
-- `INSERT … SELECT` бачить таблицю **до** вставки, тож два вихідні рядки з
-- однаковою адресою проходили охоронця обидва — і міграція падала на
-- `UNIQUE constraint failed: pages.kind, pages.parent_id, pages.slug`,
-- перервавши **всю** транзакцію. Тому адреса спершу сортується: на кожну
-- лишається один представник — той, чий `codeword` і є адресою (він
-- канонічний), далі за абеткою. Решта потрапляє у звіт як пропущені.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Портальні сценарії: те, що справді читають бот і платформа ────────────
-- `__base__` — головна сторінка платформи: у неї `web_slug = '/'`, і в новій
-- моделі порожній шлях це просто порожній `slug`.
INSERT INTO pages (
  id, slug, codeword, title, blocks, bot, kind, parent_id, position, owner_id,
  status, visibility, photo_url, template_id, reject_reason, meta, created_at, updated_at, published_at
)
WITH src AS (
  SELECT
    'sc:' || s.codeword AS id,
    CASE
      WHEN s.codeword = '__base__' THEN ''
      ELSE COALESCE(NULLIF(TRIM(COALESCE(s.web_slug, ''), '/'), ''), s.codeword)
    END AS slug,
    COALESCE(s.codeword, '') AS codeword,
    s.title, s.page_data, s.photo_url,
    CASE WHEN s.is_active IS NULL OR s.is_active = 1 THEN 'published' ELSE 'draft' END AS status,
    s.caption_top, s.caption_mid, s.caption_bot, s.keyboard_type, s.buttons,
    s.rich_message, s.rich_data, s.awaits_input, s.input_path, s.input_next,
    s.price, s.qty_options, s.notify_groups, s.notify_template,
    s.created_at, s.updated_at
  FROM scenarios s
),
ranked AS (
  SELECT src.*, ROW_NUMBER() OVER (
    PARTITION BY slug ORDER BY (slug = codeword) DESC, codeword
  ) AS pick
  FROM src
)
SELECT
  r.id, r.slug, r.codeword, r.title,
  COALESCE(NULLIF(TRIM(COALESCE(r.page_data, '')), ''), '{}'),
  json_object(
    'caption_top', r.caption_top,
    'caption_mid', r.caption_mid,
    'caption_bot', r.caption_bot,
    'keyboard_type', r.keyboard_type,
    'buttons', CASE WHEN json_valid(COALESCE(r.buttons, '')) THEN json(r.buttons) ELSE json('[]') END,
    'rich_message', CASE WHEN r.rich_message IN ('true', '1') THEN json('true') ELSE json('false') END,
    'rich_data', CASE
      WHEN json_valid(COALESCE(r.rich_data, '')) AND json_type(r.rich_data) = 'array' THEN json(r.rich_data)
      ELSE NULL
    END,
    'awaits_input', r.awaits_input,
    'input_path', r.input_path,
    'input_next', r.input_next,
    'price', r.price,
    'qty_options', r.qty_options,
    'notify_groups', r.notify_groups,
    'notify_template', r.notify_template
  ),
  'page', '', 0, NULL, r.status, 'public', r.photo_url, NULL, NULL,
  json_object('legacy_source', 'scenarios', 'legacy_key', r.codeword),
  r.created_at, r.updated_at, NULL
FROM ranked r
WHERE r.pick = 1
  AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = r.id)
  AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.codeword <> '' AND p.codeword = r.codeword)
  AND NOT EXISTS (
    SELECT 1 FROM pages p
    WHERE p.kind = 'page' AND p.parent_id = '' AND p.slug = r.slug
  );

-- ── 2. Вкладка «Адмін»: контент, який не читав ніхто ────────────────────────
-- Переносимо, бо це чиясь робота, але з `status = 'draft'` і
-- `visibility = 'private'`: назовні такий рядок не потрапляє, доки власник не
-- вирішить інакше. `codeword` тут — справжній конфлікт (таблиці історично
-- незалежні), тому охоронець на нього обов'язковий.
INSERT INTO pages (
  id, slug, codeword, title, blocks, bot, kind, parent_id, position, owner_id,
  status, visibility, photo_url, template_id, reject_reason, meta, created_at, updated_at, published_at
)
WITH src AS (
  SELECT
    'sa:' || a.codeword AS id,
    CASE
      WHEN a.codeword = '__base__' THEN ''
      ELSE COALESCE(NULLIF(TRIM(COALESCE(a.web_slug, ''), '/'), ''), a.codeword)
    END AS slug,
    COALESCE(a.codeword, '') AS codeword,
    a.title, a.page_data, a.photo_url,
    a.caption_top, a.caption_mid, a.caption_bot, a.keyboard_type, a.buttons,
    a.rich_message, a.rich_data, a.awaits_input, a.input_path, a.input_next,
    a.price, a.qty_options, a.notify_groups, a.notify_template,
    a.created_at, a.updated_at
  FROM "scenarios-admin" a
),
ranked AS (
  SELECT src.*, ROW_NUMBER() OVER (
    PARTITION BY slug ORDER BY (slug = codeword) DESC, codeword
  ) AS pick
  FROM src
)
SELECT
  r.id, r.slug, r.codeword, r.title,
  COALESCE(NULLIF(TRIM(COALESCE(r.page_data, '')), ''), '{}'),
  json_object(
    'caption_top', r.caption_top,
    'caption_mid', r.caption_mid,
    'caption_bot', r.caption_bot,
    'keyboard_type', r.keyboard_type,
    'buttons', CASE WHEN json_valid(COALESCE(r.buttons, '')) THEN json(r.buttons) ELSE json('[]') END,
    'rich_message', CASE WHEN r.rich_message IN ('true', '1') THEN json('true') ELSE json('false') END,
    'rich_data', CASE
      WHEN json_valid(COALESCE(r.rich_data, '')) AND json_type(r.rich_data) = 'array' THEN json(r.rich_data)
      ELSE NULL
    END,
    'awaits_input', r.awaits_input,
    'input_path', r.input_path,
    'input_next', r.input_next,
    'price', r.price,
    'qty_options', r.qty_options,
    'notify_groups', r.notify_groups,
    'notify_template', r.notify_template
  ),
  'page', '', 0, NULL, 'draft', 'private', r.photo_url, NULL, NULL,
  json_object('legacy_source', 'scenarios-admin', 'legacy_key', r.codeword),
  r.created_at, r.updated_at, NULL
FROM ranked r
WHERE r.pick = 1
  AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = r.id)
  AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.codeword <> '' AND p.codeword = r.codeword)
  AND NOT EXISTS (
    SELECT 1 FROM pages p
    WHERE p.kind = 'page' AND p.parent_id = '' AND p.slug = r.slug
  );

-- ── 3. Сайти → групи сторінок (`kind = 'collection'`) ───────────────────────
-- `settings.navigation` переносимо як є в `meta`: у новій моделі навігація
-- обчислюється з дочірніх сторінок, але старий список лишається поруч — щоб
-- було з чим звірити, а не «мабуть, воно те саме».
INSERT INTO pages (
  id, slug, codeword, title, blocks, bot, kind, parent_id, position, owner_id,
  status, visibility, photo_url, template_id, reject_reason, meta, created_at, updated_at, published_at
)
WITH src AS (
  SELECT
    'site:' || st.id AS id,
    st.slug AS slug,
    '' AS codeword,
    st.title, st.owner_id, st.status, st.template_id, st.reject_reason, st.thumbnail,
    CASE WHEN st.is_public = 1 THEN 'public' ELSE 'private' END AS visibility,
    st.settings, st.created_at, st.updated_at, st.published_at
  FROM sites st
),
ranked AS (
  SELECT src.*, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) AS pick
  FROM src
)
SELECT
  r.id, r.slug, r.codeword, r.title, '{}', NULL,
  'collection', '', 0, r.owner_id, r.status, r.visibility,
  r.thumbnail, r.template_id, r.reject_reason,
  json_object(
    'legacy_source', 'sites',
    'settings', CASE
      WHEN json_valid(COALESCE(r.settings, '')) THEN json(r.settings)
      ELSE json('{}')
    END
  ),
  r.created_at, r.updated_at, r.published_at
FROM ranked r
WHERE r.pick = 1
  AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = r.id)
  AND NOT EXISTS (
    SELECT 1 FROM pages p
    WHERE p.kind = 'collection' AND p.parent_id = '' AND p.slug = r.slug
  );

-- ── 4. Сторінки сайтів → сторінки всередині групи ───────────────────────────
-- `JOIN sites`, а не `LEFT JOIN`: сторінка без сайту недосяжна (на неї немає
-- маршруту), тож переносити її означає створити сироту вже в новій таблиці.
-- У D1 зовнішні ключі ввімкнені, тому таких рядків у живій базі бути не може —
-- тут це захист на випадок, а не робочий шлях.
INSERT INTO pages (
  id, slug, codeword, title, blocks, bot, kind, parent_id, position, owner_id,
  status, visibility, photo_url, template_id, reject_reason, meta, created_at, updated_at, published_at
)
WITH src AS (
  SELECT
    'sp:' || sp.id AS id,
    sp.slug AS slug,
    '' AS codeword,
    sp.title, sp.page_data, sp.order_index, sp.status, sp.meta AS legacy_meta,
    sp.created_at, sp.updated_at, sp.published_at,
    'site:' || sp.site_id AS parent_id,
    st.owner_id,
    CASE
      WHEN st.is_public = 1 AND sp.status = 'published' THEN 'public'
      ELSE 'private'
    END AS visibility
  FROM site_pages sp
  JOIN sites st ON st.id = sp.site_id
),
ranked AS (
  SELECT src.*, ROW_NUMBER() OVER (PARTITION BY parent_id, slug ORDER BY id) AS pick
  FROM src
)
SELECT
  r.id, r.slug, r.codeword, r.title,
  COALESCE(NULLIF(TRIM(COALESCE(r.page_data, '')), ''), '{}'),
  NULL,
  'page', r.parent_id, COALESCE(r.order_index, 0), r.owner_id,
  CASE WHEN r.status = 'published' THEN 'published' ELSE 'draft' END,
  r.visibility,
  NULL, NULL, NULL,
  json_object(
    'legacy_source', 'site_pages',
    'legacy_id', r.id,
    'meta', CASE
      WHEN json_valid(COALESCE(r.legacy_meta, '')) THEN json(r.legacy_meta)
      ELSE json('{}')
    END
  ),
  r.created_at, r.updated_at, r.published_at
FROM ranked r
WHERE r.pick = 1
  AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = r.id)
  AND NOT EXISTS (
    SELECT 1 FROM pages p
    WHERE p.kind = 'page' AND p.parent_id = r.parent_id AND p.slug = r.slug
  );
