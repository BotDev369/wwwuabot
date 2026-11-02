-- ═════════════════════════════════════════════════════════════════════════════
-- Кожна сторінка називає свій шаблон
--
-- Що відбулося. Після `2026-11-02-scenarios-01-retire-test-rows.sql` у
-- `scenarios` лишилося 22 рядки, і вісім із них мали `template_key = NULL`:
-- лендінг дослідження, п'ять сторінок аналізу дат, старий лендінг платформи
-- (`main`) і ручна сторінка-візитка (`evgen-mitchenko`). Порожній ключ означає
-- «сторінку зібрали якось»: ні форма, ні генератор за неї не відповідають.
--
-- Що робимо з кожним.
--
-- 1. `viruvannia` → `research`. Каркас обкладинки збирає
--    `scripts/research/build-pages.mjs` із `content/viruvannia/blocks/*.md`;
--    ключ називає цей генератор. Полів у шаблону немає — тексту для редагування
--    теж (він у markdown).
-- 2. `dateanalysis*` (5 адрес) → `screen`. Це сторінки-механіки: у `page_data`
--    лежить один блок (`date-analysis`, `compare-setup`, `analysis-systems`),
--    а адресу й параметри приносить `slug`. Тексту, який править людина, у них
--    немає, і створювати такі сторінки формою не можна.
-- 3. `main` і `evgen-mitchenko` → у `scenarios_legacy_20261102`. Це сторінки
--    попереднього продукту: лендінг «Твій простір у Telegram», який замінила
--    сама платформа (її екрани — у роутері), і ручна візитка зі скріншотами без
--    власника. На жодну з них немає посилання ні з вебу, ні з бота; шаблону, з
--    якого їх можна відтворити, теж немає. Рядки лишаються в legacy-таблиці й
--    повертаються одним `INSERT … SELECT`.
--
-- Чому саме так, а не «лишити порожній ключ». Правило просте: **сторінка без
-- шаблону не існує** (докладніше — `docs/PAGES.md`, розділ про шаблони
-- платформи). Порожній ключ у рядку — це борг, який ніхто не бачить: звіт
-- нижче показує його нулем, а не списком.
--
-- Ідемпотентна: повторний запуск оновлює ті самі ключі й видаляє 0 рядків.
--
-- Запуск (з кореня репозиторію, див. `docs/D1_OPS.md`):
--   npx wrangler d1 execute wwwuabot-db-dev --remote \
--     --config api-dev/wrangler.toml \
--     --file scripts/migrations/2026-11-02-scenarios-02-templates.sql
-- ═════════════════════════════════════════════════════════════════════════════

INSERT OR REPLACE INTO scenarios_legacy_20261102
SELECT * FROM scenarios WHERE slug IN ('main', 'evgen-mitchenko');

-- Звіт «до»: що зникає й що отримує ключ.
SELECT id, slug, template_key, length(COALESCE(page_data, '')) AS page_bytes
FROM scenarios
WHERE slug IN ('main', 'evgen-mitchenko', 'viruvannia')
   OR slug LIKE 'dateanalysis%'
ORDER BY id;

DELETE FROM scenarios WHERE slug IN ('main', 'evgen-mitchenko');

UPDATE users
SET active_scenario = NULL
WHERE active_scenario IS NOT NULL
  AND active_scenario NOT IN (SELECT slug FROM scenarios);

UPDATE scenarios SET template_key = 'research' WHERE slug = 'viruvannia';

UPDATE scenarios
SET template_key = 'screen'
WHERE slug IN ('dateanalysis',
               'dateanalysis/analysis',
               'dateanalysis/compare/setup',
               'dateanalysis/compare/systems',
               'dateanalysis/compare/table');

-- Звіт «після»: порожніх ключів бути не має.
SELECT COUNT(*) AS pages,
       SUM(CASE WHEN template_key IS NULL OR template_key = '' THEN 1 ELSE 0 END) AS without_template
FROM scenarios;
