-- ═════════════════════════════════════════════════════════════════════════════
-- Адреси блоків дослідження: `viruvannia-a1` → `viruvannia/sto-vidsotkiv`
--
-- Чому. Плоский `viruvannia-a1` — це адреса, зроблена з номера блока, а не з
-- предмета: людина не може вгадати, що за ним стоїть, а глибини в адресі
-- немає — лендінг і його сторінка лежать на одному рівні. Контракт адрес
-- (`docs/URL.md`) каже: **два сегменти, другий — слово**, `модуль/елемент`.
-- Тут — `viruvannia/<address>`, де `address` написав автор у frontmatter
-- (`content/viruvannia/blocks/*.md`).
--
-- Як саме безпечно. Адреса — контракт, тож **спершу** в `slug_aliases`
-- з'являється пара «стара → нова», і лише потім рядок переїжджає: між цими
-- двома кроками немає моменту, коли старе посилання вже мертве, а редиректу ще
-- немає. Далі `users.active_scenario` переписується за таблицею (`JOIN` тут не
-- потрібен: адрес у людини одна).
--
-- Зміст сторінок ця міграція не чіпає — вона лише про адресу. Нові `page_data`
-- (з посиланнями на нові адреси) приїдуть згенерованим файлом
-- `2026-11-02-scenarios-05-research-addresses.sql`, який ідемпотентно
-- перезаписує ті самі рядки за новими адресами.
--
-- Ідемпотентна: повторний запуск не знайде старих адрес і не зробить нічого.
--
-- Запуск:
--   npx wrangler d1 execute wwwuabot-db-dev --remote \
--     --config api-dev/wrangler.toml \
--     --file scripts/migrations/2026-11-02-scenarios-04-research-rename.sql
-- ═════════════════════════════════════════════════════════════════════════════

-- 1. Історія адрес — до переїзду, не після.
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('viruvannia-a1', 'viruvannia/sto-vidsotkiv');
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('viruvannia-a2', 'viruvannia/dvi-pravdy');
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('viruvannia-a3', 'viruvannia/khto-roste-khto-zmenshuietsia');
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('viruvannia-b1', 'viruvannia/khrystyianstvo');
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('viruvannia-b2', 'viruvannia/islam');
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('viruvannia-b3', 'viruvannia/induizm');
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('viruvannia-b4', 'viruvannia/buddyzm');
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('viruvannia-b5', 'viruvannia/narodni-relihii');
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('viruvannia-c1', 'viruvannia/nones');
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('viruvannia-c2', 'viruvannia/ateisty-ahnostyky');
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('viruvannia-c3', 'viruvannia/kytai');
INSERT OR IGNORE INTO slug_aliases (alias, slug) VALUES ('viruvannia-d1', 'viruvannia/matrytsia-viruvan');

-- 2. Переїзд. `WHERE slug = …` — щоб повторний запуск був порожнім.
UPDATE scenarios SET slug = 'viruvannia/sto-vidsotkiv' WHERE slug = 'viruvannia-a1';
UPDATE scenarios SET slug = 'viruvannia/dvi-pravdy' WHERE slug = 'viruvannia-a2';
UPDATE scenarios SET slug = 'viruvannia/khto-roste-khto-zmenshuietsia' WHERE slug = 'viruvannia-a3';
UPDATE scenarios SET slug = 'viruvannia/khrystyianstvo' WHERE slug = 'viruvannia-b1';
UPDATE scenarios SET slug = 'viruvannia/islam' WHERE slug = 'viruvannia-b2';
UPDATE scenarios SET slug = 'viruvannia/induizm' WHERE slug = 'viruvannia-b3';
UPDATE scenarios SET slug = 'viruvannia/buddyzm' WHERE slug = 'viruvannia-b4';
UPDATE scenarios SET slug = 'viruvannia/narodni-relihii' WHERE slug = 'viruvannia-b5';
UPDATE scenarios SET slug = 'viruvannia/nones' WHERE slug = 'viruvannia-c1';
UPDATE scenarios SET slug = 'viruvannia/ateisty-ahnostyky' WHERE slug = 'viruvannia-c2';
UPDATE scenarios SET slug = 'viruvannia/kytai' WHERE slug = 'viruvannia-c3';
UPDATE scenarios SET slug = 'viruvannia/matrytsia-viruvan' WHERE slug = 'viruvannia-d1';

-- 3. Людина, яка стояла на старій адресі, лишається на тій самій сторінці.
UPDATE users
SET active_scenario = (SELECT a.slug FROM slug_aliases a WHERE a.alias = users.active_scenario)
WHERE active_scenario IN (SELECT alias FROM slug_aliases);

-- Звіт: старі адреси лишились лише історією, сторінок без адреси немає.
SELECT (SELECT COUNT(*) FROM scenarios) AS pages,
       (SELECT COUNT(*) FROM slug_aliases) AS aliases,
       (SELECT COUNT(*) FROM scenarios WHERE slug LIKE 'viruvannia-%') AS old_style_pages;
