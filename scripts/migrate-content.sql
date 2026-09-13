-- ─────────────────────────────────────────────────────────────────────────────
-- Контент в одну таблицю: scenarios + sites + site_pages → pages
--
-- **Навіщо.** Три таблиці описували те саме: сторінку контенту. `scenarios`
-- читали бот і платформа, `sites` + `site_pages` — друга реалізація того самого
-- для вебу. Навігація сайту при цьому жила ще й третім списком —
-- `sites.settings.navigation` дублював назви сторінок, які вже існували рядками
-- в `site_pages`. (Четверта, `scenarios-admin`, була тестовою копією `scenarios`
-- і не мала жодного читача поза адмінкою — її видалено 13.09.2026, тому
-- переносити з неї нічого.)
--
-- **Адреса тепер одна.** Легасі-рядок має дві назви того самого: `web_slug`
-- (шлях вебу) і `codeword` (ключ діплінка бота). У `pages` є одна колонка
-- `slug`, а подання будує код (`@wwwuabot/shared/content`):
--
--     slug = 'mydate/1980-03-03'   →  веб: /mydate/1980-03-03
--                                     бот: ?start=mydate_1980-03-03
--
-- Перевага віддається `web_slug`, бо діплінк будується **з** адреси, а не
-- навпаки; коли `web_slug` порожній (у більшості сценаріїв) — адресою стає
-- `codeword`. Стара діплінк-адреса не втрачається: вона лишається в
-- `meta.legacy_key`, і рядки, де вона відрізняється від нової адреси,
-- друкуються окремим списком у звіті.
--
-- **Правила цього файлу.**
--   1. Він **тільки додає**. Жодного `DELETE`, `DROP` чи `UPDATE`: легасі-таблиці
--      лишаються недоторканими, тож відкат — це видалення рядків `pages`.
--   2. Він **ідемпотентний**: `id` детермінований (`sc:` / `site:` / `sp:`
--      + старий ключ), тому повторний запуск не створює дублів.
--   3. Він **не мовчить про конфлікти**. Рядок, який не пройшов перевірку,
--      лишається в легасі-таблиці, а `migrate-content.mjs` друкує його на ім'я
--      разом із причиною — рішення ухвалює власник, а не скрипт. Тихо
--      перезаписати чужий контент гірше, ніж не перенести його.
--   4. Таблицю `pages` створює **не** цей файл, а реєстр
--      (`packages/shared/src/database/tables.ts`) — саме тому тут немає
--      `CREATE TABLE`: DDL мусить жити в одному місці.
--
-- **Що робить нормалізація адреси** (вираз `canonical` у кожній інструкції):
--   крок 1 — вибір джерела: `web_slug`, а якщо він порожній — `codeword`;
--   крок 2 — `_` → `-`: підкреслення в боті розділює сегменти, тож усередині
--            сегмента його бути не може (інакше `?start=` неоднозначний);
--   крок 3 — нижній регістр і прибирання подвоєних слешів.
-- Адреса, яка після цього все одно некоректна (чужі символи), **не
-- переноситься** — вона потрапляє у звіт. Це стосується і `__base__`: це
-- легасі-ключ головної, а не адреса, тому він стає порожнім `slug`.
--
-- **Чому кожна інструкція починається з `WITH src AS (…)` і `ROW_NUMBER()`.** Це
-- не оздоба, а виправлення реальної вади. Підзапит `NOT EXISTS` всередині
-- `INSERT … SELECT` бачить таблицю **до** вставки, тож два вихідні рядки з
-- однаковою адресою проходили охоронця обидва — і міграція падала на
-- `UNIQUE constraint failed: pages.slug`, перервавши **всю** транзакцію. Тому
-- адреса спершу ранжується: на кожну лишається один представник — той, чий
-- `codeword` і є адресою (він канонічний), далі за абеткою.
--
-- **Порядок інструкцій = пріоритет.** Адреса унікальна в усій таблиці, а
-- джерела історично незалежні, тож збіг між ними можливий (напр. сценарій
-- `about` і сторінка сайту `about`). Між інструкціями `NOT EXISTS` бачить уже
-- вставлені рядки — тому перемагає джерело, яке стоїть вище: сценарії → сайти →
-- сторінки сайтів. Решта потрапляє у звіт, і рішення «кого перейменувати» — за
-- власником.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Сценарії: те, що справді читають бот і платформа ─────────────────────
INSERT INTO pages (
  id, slug, title, blocks, bot, kind, parent_id, position, owner_id,
  status, visibility, photo_url, template_id, reject_reason, meta, created_at, updated_at, published_at
)
WITH src AS (
  SELECT
    'sc:' || s.codeword AS id,
    CASE
      WHEN COALESCE(s.codeword, '') = '__base__' THEN ''
      ELSE replace(
        lower(
          replace(
            replace(
              TRIM(COALESCE(NULLIF(TRIM(COALESCE(s.web_slug, ''), '/'), ''), s.codeword), '/'),
              '//', '/'
            ),
            '//', '/'
          )
        ),
        '_', '-'
      )
    END AS slug,
    COALESCE(s.codeword, '') AS legacy_key,
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
    PARTITION BY slug ORDER BY (slug = legacy_key) DESC, legacy_key
  ) AS pick
  FROM src
)
SELECT
  r.id, r.slug, r.title,
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
  json_object('legacy_source', 'scenarios', 'legacy_key', r.legacy_key),
  r.created_at, r.updated_at, NULL
FROM ranked r
WHERE r.pick = 1
  AND (r.slug = '' OR r.slug GLOB '[a-z0-9]*')
  AND NOT (r.slug GLOB '*[^a-z0-9/-]*')
  AND r.slug NOT LIKE '%//%'
  AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = r.id)
  AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.slug = r.slug);

-- ── 2. Сайти → групи сторінок (`kind = 'collection'`) ───────────────────────
-- `settings.navigation` переносимо як є в `meta`: у новій моделі навігація
-- обчислюється з дочірніх сторінок, але старий список лишається поруч — щоб
-- було з чим звірити, а не «мабуть, воно те саме».
INSERT INTO pages (
  id, slug, title, blocks, bot, kind, parent_id, position, owner_id,
  status, visibility, photo_url, template_id, reject_reason, meta, created_at, updated_at, published_at
)
WITH src AS (
  SELECT
    'site:' || st.id AS id,
    replace(
      lower(
        replace(
          replace(TRIM(COALESCE(st.slug, ''), '/'), '//', '/'),
          '//', '/'
        )
      ),
      '_', '-'
    ) AS slug,
    COALESCE(st.slug, '') AS legacy_key,
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
  r.id, r.slug, r.title, '{}', NULL,
  'collection', '', 0, r.owner_id, r.status, r.visibility,
  r.thumbnail, r.template_id, r.reject_reason,
  json_object(
    'legacy_source', 'sites',
    'legacy_key', r.legacy_key,
    'settings', CASE
      WHEN json_valid(COALESCE(r.settings, '')) THEN json(r.settings)
      ELSE json('{}')
    END
  ),
  r.created_at, r.updated_at, r.published_at
FROM ranked r
WHERE r.pick = 1
  AND (r.slug = '' OR r.slug GLOB '[a-z0-9]*')
  AND NOT (r.slug GLOB '*[^a-z0-9/-]*')
  AND r.slug NOT LIKE '%//%'
  AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = r.id)
  AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.slug = r.slug);

-- ── 3. Сторінки сайтів → сторінки всередині групи ───────────────────────────
-- `JOIN sites`, а не `LEFT JOIN`: сторінка без сайту недосяжна (на неї немає
-- маршруту), тож переносити її означає створити сироту вже в новій таблиці.
-- У D1 зовнішні ключі ввімкнені, тому таких рядків у живій базі бути не може —
-- тут це захист на випадок, а не робочий шлях.
--
-- **Дитина їде тільки разом із групою.** `JOIN sites` гарантує, що сайт є в
-- легасі-таблиці, але **не** — що він доїхав: група могла лишитись у звіті
-- (її адресу зайняв інший рядок). Без охоронця нижче така сторінка
-- перенеслася б із `parent_id` у нікуди, і в новій таблиці з'явилася б сирота,
-- якої не бачить ні навігація (вона обчислюється з групи), ні власник.
INSERT INTO pages (
  id, slug, title, blocks, bot, kind, parent_id, position, owner_id,
  status, visibility, photo_url, template_id, reject_reason, meta, created_at, updated_at, published_at
)
WITH src AS (
  SELECT
    'sp:' || sp.id AS id,
    replace(
      lower(
        replace(
          replace(TRIM(COALESCE(sp.slug, ''), '/'), '//', '/'),
          '//', '/'
        )
      ),
      '_', '-'
    ) AS slug,
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
  r.id, r.slug, r.title,
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
  AND (r.slug = '' OR r.slug GLOB '[a-z0-9]*')
  AND NOT (r.slug GLOB '*[^a-z0-9/-]*')
  AND r.slug NOT LIKE '%//%'
  AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.id = r.id)
  AND NOT EXISTS (SELECT 1 FROM pages p WHERE p.slug = r.slug)
  AND EXISTS (SELECT 1 FROM pages p WHERE p.id = r.parent_id);
