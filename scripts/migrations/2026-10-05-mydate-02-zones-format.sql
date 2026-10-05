-- Перевід сторінки `mydate` зі старого `slots`-формату на зони Page Builder.
--
-- Причина: конвертер `convertOldFormat` не знав компонента `DateInput`, тож
-- сторінка показувала лише заголовок — форми введення дати не було взагалі.
-- Новий формат усе вже має (9 з 10 сторінок), тож розширювати legacy-шим
-- не потрібно: рядок переїжджає на `zones`, де блок називається явно.
--
-- Оновлення однієї сторінки: інші рядки не зачіпаються, `WHERE` стоїть на
-- slug. Повторний запуск безпечний — значення ті самі, тож результат лишається
-- тим самим (SQLite рахує «змінений» рядок і за такий повтор, але це той самий
-- рядок `mydate`, а не зачістка чужої сторінки).

UPDATE scenarios
SET title = 'MyDate — аналіз особистості',
    page_data = '{"version":1,"zones":{"sidebar":[],"header":[],"main":[{"id":"mydate-h","type":"text","order":0,"props":{"title":"Зрозумій себе. Зрозумій інших.","level":"h1","align":"center"}},{"id":"mydate-p","type":"text","order":1,"props":{"content":"Всебічний аналіз особистості за датою народження на перетині 12+ систем світу: від давніх традицій до сучасних технологій.","level":"body","align":"center"}},{"id":"mydate-d","type":"date-input","order":2,"props":{"label":"Дата народження","buttonLabel":"Показати аналіз","basePath":"/mydate","targetPath":"analysis"}},{"id":"mydate-t","type":"my-dates-table","order":3,"props":{}}],"footer":[]},"visibleZones":["main"]}'
WHERE slug = 'mydate';

SELECT changes() AS updated_rows;