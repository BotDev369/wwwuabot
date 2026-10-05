-- Екран аналізу однієї дати: рядок `mydate/analysis`.
--
-- Блок `date-analysis` був зареєстрований, але сторінки з ним не існувало:
-- `date-input` на `mydate` вів у `/mydate/analysis`, а такого рядка немає —
-- `ScenarioPage` показав би фолбек. Рядок контенту йому бракувало, тож
-- створюємо його тут.
--
-- Дата передається як `?date=YYYY-MM-DD` (саме так її читає блок), а не
-- сегментом адреси: `ScenarioPage` бере весь splat як slug, тож
-- `/mydate/1980-03-03` не знайшов би жодного рядка.

-- `slug` унікальний, тому рядок вставляється лише коли його ще немає: повторний
-- запуск міграції не падає на UNIQUE і нічого не дублює.
INSERT INTO scenarios (slug, title, page_data, keyboard_type, buttons)
SELECT
  'mydate/analysis',
  'MyDate — аналіз дати',
  '{"version":1,"zones":{"sidebar":[],"header":[],"main":[{"id":"mydate-analysis","type":"date-analysis","order":0,"props":{"title":"Аналіз за датою народження","backUrl":"/mydate"}}],"footer":[]},"visibleZones":["main"]}',
  'static',
  '[]'
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE slug = 'mydate/analysis');

SELECT changes() AS inserted_rows;