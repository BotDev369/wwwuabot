-- Кнопки розділу «Аналіз дат»: стара адреса `mydate` → `dateanalysis`.
--
-- Крок 3 міграції 09 переписав адреси всередині `page_data` — це веб-подання
-- рядка. `buttons` — окреме поле (подання бота), і саме воно тримає
-- `callback_data` зі slug та `web_app.url`. Пропущене поле не ламає ні збірку,
-- ні тести: кнопка просто веде в адресу, якої більше немає, і помітно це лише
-- людині в Telegram.
--
-- Кожен крок **ідемпотентний**: переписує лише те, що ще носить стару назву, тож
-- повторний запуск безпечний.

-- 1. `callback_data` — це slug рядка, а рядок уже перейменовано на `dateanalysis`.
UPDATE scenarios
SET buttons = replace(buttons, '"callback_data":"mydate"', '"callback_data":"dateanalysis"')
WHERE buttons LIKE '%"callback_data":"mydate"%';

-- 2. `web_app.url`: адреса, що закінчується на старий slug.
UPDATE scenarios
SET buttons = replace(buttons, '/mydate"', '/dateanalysis"')
WHERE buttons LIKE '%/mydate"%';

-- 3. Те саме з хвостом (`/mydate/analysis`): адреса розділу має багато кроків.
UPDATE scenarios
SET buttons = replace(buttons, '/mydate/', '/dateanalysis/')
WHERE buttons LIKE '%/mydate/%';

-- 4. Підпис кнопки: назва розділу одна — «Аналіз дат». Крок 4 міграції 09
--    зробив це для `page_data`, а кнопка — окреме поле, тож у боті лишалась
--    стара назва процесу при новій назві розділу.
UPDATE scenarios
SET buttons = replace(buttons, 'МоїДати', 'Аналіз дат')
WHERE buttons LIKE '%МоїДати%';

-- 5. Кнопка «Сайт …» веде в застосунок розділу: щоб назва читалась як назва, а
--    не як два слова поряд, вона стоїть у лапках.
UPDATE scenarios
SET buttons = replace(buttons, 'Сайт Аналіз дат', 'Сайт «Аналіз дат»')
WHERE buttons LIKE '%Сайт Аналіз дат%';

-- Звіт: після цього кроку старої адреси в кнопках не лишається ніде.
SELECT id, slug, buttons FROM scenarios WHERE buttons LIKE '%mydate%' ORDER BY slug;

SELECT changes() AS rows_touched;
