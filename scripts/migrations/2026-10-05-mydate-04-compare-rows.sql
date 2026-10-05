-- Екрани співставлення: три рядки контенту під уже написані блоки.
--
-- Блоки `compare-setup`, `compare-systems`, `compare-table` були зареєстровані
-- з самого початку, але сторінок з них не існувало: ланцюг обривався фолбеком.
-- Рядки не несуть логіки — тільки зону з одним блоком, як решта контенту.
--
-- Стан між екранами їде параметрами адреси (`?dates=`, `?sys=`, `?p=`), а не
-- сегментом шляху: `ScenarioPage` бере весь splat як slug, тож `/mydate/дати+дати`
-- не знайшов би жодного рядка.

-- 1. Ввід дат для співставлення
INSERT INTO scenarios (slug, title, page_data, keyboard_type, buttons)
SELECT 'mydate/compare/setup', 'Співставлення — дати',
  '{"version":1,"zones":{"sidebar":[],"header":[],"main":[{"id":"mydate-cs","type":"compare-setup","order":0,"props":{"title":"Співставлення дат","maxDates":10,"nextUrl":"/mydate/compare/systems"}}],"footer":[]},"visibleZones":["main"]}',
  'static', '[]'
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE slug = 'mydate/compare/setup');

-- 2. Вибір систем і параметрів
INSERT INTO scenarios (slug, title, page_data, keyboard_type, buttons)
SELECT 'mydate/compare/systems', 'Співставлення — системи',
  '{"version":1,"zones":{"sidebar":[],"header":[],"main":[{"id":"mydate-csys","type":"compare-systems","order":0,"props":{"title":"Оберіть системи та параметри","resultUrl":"/mydate/compare/table"}}],"footer":[]},"visibleZones":["main"]}',
  'static', '[]'
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE slug = 'mydate/compare/systems');

-- 3. Таблиця результатів
INSERT INTO scenarios (slug, title, page_data, keyboard_type, buttons)
SELECT 'mydate/compare/table', 'Співставлення — результати',
  '{"version":1,"zones":{"sidebar":[],"header":[],"main":[{"id":"mydate-ct","type":"compare-table","order":0,"props":{"title":"Порівняння за датами","backUrl":"/mydate/compare/setup"}}],"footer":[]},"visibleZones":["main"]}',
  'static', '[]'
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE slug = 'mydate/compare/table');

SELECT changes() AS inserted_rows;