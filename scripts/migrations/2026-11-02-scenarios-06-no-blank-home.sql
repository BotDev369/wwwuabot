-- ═════════════════════════════════════════════════════════════════════════════
-- Порожня «домашня сторінка» не є сторінкою
--
-- Звідки вона. `resolveScenario` (api-dev) перед читанням вставляв рядок
-- `scenarios (slug = '')` — «домашня сторінка», якої до 13.09.2026 потребувала
-- навігація. Рядок не має ні назви, ні `page_data`, ні `template_key` і не
-- створюється ні формою, ні генератором: він з'являвся сам, від будь-якого
-- запиту на невідому адресу.
--
-- Чому видаляємо. Правило платформи — **сторінка без шаблону не існує**
-- (`docs/PAGES.md` §7): рядок, який ніхто не створював і який нічого не
-- показує, — це саме той борг, від якого ми прибирали `scenarios`. Корінь
-- продукту (/) веде на екран акаунта, а невідома адреса й так показує фолбек,
-- тож ніщо не ламається.
--
-- Межа безпеки: видаляємо **тільки** рядок із порожнім `slug`, без власника і
-- без жодного блоку в `page_data`. Якщо хтось колись наповнив його — рядок
-- лишиться, і тоді з ним треба розбиратися окремо (він не порожній).
--
-- Ідемпотентна.
--
-- Запуск:
--   npx wrangler d1 execute wwwuabot-db-dev --remote \
--     --config api-dev/wrangler.toml \
--     --file scripts/migrations/2026-11-02-scenarios-06-no-blank-home.sql
-- ═════════════════════════════════════════════════════════════════════════════

-- Звіт «до»: що саме зникає.
SELECT id, slug, title, template_key, length(COALESCE(page_data, '')) AS page_bytes
FROM scenarios
WHERE slug = ''
  AND owner_id IS NULL
  AND length(COALESCE(page_data, '')) = 0;

DELETE FROM scenarios
WHERE slug = ''
  AND owner_id IS NULL
  AND length(COALESCE(page_data, '')) = 0;

-- Звіт «після»: сторінок без шаблону немає.
SELECT COUNT(*) AS pages,
       SUM(CASE WHEN slug = '' THEN 1 ELSE 0 END) AS blank_home,
       SUM(CASE WHEN template_key IS NULL OR template_key = '' THEN 1 ELSE 0 END) AS without_template
FROM scenarios;
