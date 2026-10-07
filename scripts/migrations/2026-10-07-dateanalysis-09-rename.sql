-- Розділ «Аналіз дат»: адреса `mydate` → `dateanalysis`, назва — одна.
--
-- Один рядок контенту = один екран, тож перейменування розділу — це правки в
-- тих самих рядках `scenarios`: адреса (`slug`), хедер (`title`) і **внутрішні
-- адреси** всередині `page_data` (`basePath`/`nextUrl`/`backUrl`/`targetUrl`).
-- Пропустити хоч одну — і екран лишиться, а ланцюг переходів обірветься на
-- адресі, якої вже немає.
--
-- Кожен крок **ідемпотентний**: він або переписує те, що ще носить стару назву,
-- або не зачіпає нічого. Тому повторний запуск безпечний, а рядок, який уже
-- перейменували в адмінці, не переписується навмання.

-- 1. Адреса: `mydate` → `dateanalysis`, хвіст (`/analysis`, `/compare/…`) як був.
UPDATE scenarios
SET slug = 'dateanalysis' || substr(slug, length('mydate') + 1)
WHERE slug = 'mydate' OR slug LIKE 'mydate/%';

-- 2. Хедер розділу: в основі, на екрані результату і на кроках — одна назва.
UPDATE scenarios
SET title = 'Аналіз дат'
WHERE slug = 'dateanalysis' OR slug LIKE 'dateanalysis/%';

-- 3. Адреси **всередині контенту**: без цього кнопки вели б на `/mydate`.
UPDATE scenarios
SET page_data = replace(page_data, '/mydate', '/dateanalysis')
WHERE page_data LIKE '%/mydate%';

-- 4. Старі назви процесу («МоїДати», «Співставлення дат») — це назви кроку,
--    а крок тепер один: та сама назва розділу.
UPDATE scenarios
SET page_data = replace(page_data, 'МоїДати', 'Аналіз дат')
WHERE page_data LIKE '%МоїДати%';

UPDATE scenarios
SET page_data = replace(page_data, 'Співставлення дат', 'Аналіз дат')
WHERE page_data LIKE '%Співставлення дат%';

-- 5. Підпис над таблицею аналізу: стара назва кроку — не те, що людина бачить.
UPDATE scenarios
SET page_data = json_set(page_data, '$.zones.main[0].props.title', 'Результат аналізу:')
WHERE json_extract(page_data, '$.zones.main[0].type') = 'date-analysis'
  AND json_extract(page_data, '$.zones.main[0].props.title') = 'Аналіз Дат';

-- 6. Регістр назви: «Аналіз Дат» → «Аналіз дат» — після кроку 5, щоб не
--    перебити підпис результату.
UPDATE scenarios
SET page_data = replace(page_data, 'Аналіз Дат', 'Аналіз дат')
WHERE page_data LIKE '%Аналіз Дат%';

-- 7. Ідентифікатори блоків усередині рядка. Це не адреса, але теж слово
--    `mydate` в даних: воно видно в редакторі журналу сторінки.
UPDATE scenarios
SET page_data = replace(page_data, '"id":"mydate-', '"id":"dateanalysis-')
WHERE page_data LIKE '%"id":"mydate-%';

-- Звіт: що саме тепер у рядках розділу.
SELECT id, slug, title, json_extract(page_data, '$.zones.main[0].type') AS block
FROM scenarios
WHERE slug = 'dateanalysis' OR slug LIKE 'dateanalysis/%'
ORDER BY slug;

SELECT changes() AS rows_touched;
