-- ═════════════════════════════════════════════════════════════════════════════
-- `scenarios.template_key` не буває порожнім
--
-- Що сталося. Шість сторінок «Аналізу людей та подій»
-- (`dateanalysis/systems`, `self`, `person`, `event`, `compare/events`,
-- `compare/mixed`) заведено міграцією 2026-11-03 — з `page_data`, але без
-- ключа шаблону. Правило каже: ключ називає каркас, і порожній ключ означає
-- «сторінку зібрали якось» (docs/PAGES.md §7). Це борг, який ніхто не бачить:
-- форма його не показує, а читач підставляє типовий `card`, і сторінка-екран
-- виглядає як сторінка людини.
--
-- Що робимо. Ключ `screen` — «сторінка-механіка: один блок у каркасі, адреса й
-- параметри приходять із собою» (platform-templates.ts). Саме так уже
-- підписані `dateanalysis/analysis` (535) і `dateanalysis/compare/people` (540).
--
-- Чому не чіпаємо `updated_at`. Це час зміни **вмісту**, а не метаданих:
-- оновлення зсунуло б сторінки в публічному списку (`updated_at DESC`).
--
-- Чому з копією. Ті самі рядки кладуться в `scenarios_legacy_20261106` — як
-- `_20260914`, `_20261102` і `_20261103` до них: рядок можна повернути одним
-- `INSERT … SELECT`.
--
-- Ідемпотентна: повторний запуск змінює 0 рядків.
--
-- Запуск (з кореня репозиторію, див. `docs/D1_OPS.md`):
--   npx wrangler d1 execute wwwuabot-db-dev --remote \
--     --config api-dev/wrangler.toml \
--     --file scripts/migrations/2026-11-06-scenarios-01-platform-template-keys.sql
-- ═════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scenarios_legacy_20261106 AS
SELECT * FROM scenarios WHERE 0;

-- Звіт «до»: що саме має порожній ключ.
SELECT id, slug, title, owner_id, length(COALESCE(page_data, '')) AS page_bytes
FROM scenarios
WHERE template_key IS NULL OR template_key = ''
ORDER BY id;

INSERT OR REPLACE INTO scenarios_legacy_20261106
SELECT * FROM scenarios
WHERE (template_key IS NULL OR template_key = '')
  AND page_data IS NOT NULL
  AND owner_id IS NULL;

-- Контент платформи без ключа — це механіка (у неї немає полів для людини).
UPDATE scenarios
SET template_key = 'screen'
WHERE (template_key IS NULL OR template_key = '')
  AND page_data IS NOT NULL
  AND owner_id IS NULL;

-- Звіт «після»: порожніх ключів не має лишитися.
SELECT count(*) AS still_empty FROM scenarios
WHERE template_key IS NULL OR template_key = '';
