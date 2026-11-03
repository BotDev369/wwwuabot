-- ═════════════════════════════════════════════════════════════════════════════
-- Кроки порівняння дат: третій сегмент адреси → окремі адреси без глибини
--
-- Чому. Контракт (`docs/URL.md` §3) каже: адреса сторінки — рівно два
-- сегменти, `модуль/елемент`, а стан потоку (крок майстерні, фільтр, порядок)
-- живе в параметрах. Три кроки порівняння лежали третім сегментом:
-- `dateanalysis/compare/{setup,systems,table}`.
--
-- Що насправді лежить у цих трьох рядках (перевірено на базі, не на пам'яті):
--
--   * `…/compare/setup` — живий крок: блок `compare-setup`, `nextUrl` уже веде
--     на `/dateanalysis/analysis` (результат приходить з `?dates=…`). Це не
--     стан у адресі, а звичайна сторінка — їй досить `dateanalysis/compare`.
--   * `…/compare/systems` і `…/compare/table` — **побайтові дублі**
--     `dateanalysis/analysis`: той самий блок `date-analysis`, той самий
--     `targetUrl`/`backUrl`. Потоку з двох екранів більше немає (він злився в
--     `analysis`), лишились дві копії з трьома сегментами.
--
-- Тому: крок переїжджає на `dateanalysis/compare`, дублі віддають свої адреси
-- аліасами й зникають. Обидві старі адреси лишаються живими як `301` — вони
-- вже пішли в закладки, і робити з них `404` не можна.
--
-- Безпека даних. Дублі лягають у `scenarios_legacy_20261103` **до** `DELETE` —
-- той самий принцип, що в `2026-11-02-scenarios-01-retire-test-rows.sql`:
-- бекофісна копія лишається в базі, якщо колись знадобиться подивитись, що
-- саме прибрали.
--
-- Ідемпотентна: повторний запуск додає 0 аліасів, переїжджає 0 рядків і
-- видаляє 0 рядків.
--
-- Запуск (з кореня репозиторію, див. `docs/D1_OPS.md`):
--   npx wrangler d1 execute wwwuabot-db-dev --remote \
--     --config api-dev/wrangler.toml \
--     --file scripts/migrations/2026-11-03-scenarios-01-compare-addresses.sql
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. Історія адрес — до переїзду, не після.
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('dateanalysis/compare/setup', 'dateanalysis/compare');
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('dateanalysis/compare/systems', 'dateanalysis/analysis');
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('dateanalysis/compare/table', 'dateanalysis/analysis');

-- 2. Крок переїжджає на адресу без третього сегмента.
UPDATE scenarios SET slug = 'dateanalysis/compare', updated_at = datetime('now')
WHERE slug = 'dateanalysis/compare/setup';

-- 3. Дублі: копія в бекофіс, потім `DELETE`.
CREATE TABLE IF NOT EXISTS scenarios_legacy_20261103 AS
SELECT * FROM scenarios WHERE 0;

INSERT OR REPLACE INTO scenarios_legacy_20261103
SELECT * FROM scenarios
WHERE slug IN ('dateanalysis/compare/systems', 'dateanalysis/compare/table');

-- Звіт «до»: що саме зникає з `scenarios` — адреса, назва, розмір сторінки.
SELECT id, slug, title, length(COALESCE(page_data, '')) AS page_bytes
FROM scenarios
WHERE slug IN ('dateanalysis/compare/systems', 'dateanalysis/compare/table')
ORDER BY slug;

DELETE FROM scenarios
WHERE slug IN ('dateanalysis/compare/systems', 'dateanalysis/compare/table');

-- 4. Людина, яка стояла на старій адресі, лишається на тій самій сторінці.
UPDATE users
SET active_scenario = (SELECT a.slug FROM slug_aliases a WHERE a.alias = users.active_scenario)
WHERE active_scenario IN (SELECT alias FROM slug_aliases);

-- 5. Звіт: глибших за два сегменти адрес у `scenarios` більше немає, а всі три
--    старі адреси ведуть на живі сторінки.
SELECT (SELECT COUNT(*) FROM scenarios
        WHERE length(slug) - length(REPLACE(slug, '/', '')) > 1) AS deep_pages,
       (SELECT COUNT(*) FROM scenarios WHERE slug = 'dateanalysis/compare') AS compare_page,
       (SELECT COUNT(*) FROM slug_aliases a JOIN scenarios s ON s.slug = a.slug
        WHERE instr(a.alias, 'dateanalysis/compare/') = 1) AS live_old_addresses;
