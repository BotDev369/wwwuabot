-- Головна сторінка розділу: тільки входи, без абзаців і підписів.
--
-- Було: hero + сітка кнопок + абзац-пояснення + таблиця «Дати», потім один
-- провідний абзац і речення під кожною назвою. Три рівні пояснень поспіль
-- робили екран сірим: абзац переказував те, що вже казали самі входи.
-- Стало: сім карток із знаком і тоном, без жодного пояснення.
--
-- Ідемпотентно: умова — наявний абзац (`type":"text"`) у page_data.

UPDATE scenarios
   SET page_data = '{"version":1,"zones":{"sidebar":[],"header":[],"footer":[],"main":[{"id":"dateanalysis-entries","type":"analysis-entries","order":0,"props":{"items":[{"group":"Один субʼєкт","title":"Аналізувати себе","url":"/dateanalysis/self","icon":"user","tone":"1"},{"group":"Один субʼєкт","title":"Аналізувати інших","url":"/dateanalysis/person","icon":"users","tone":"4"},{"group":"Один субʼєкт","title":"Аналізувати подію","url":"/dateanalysis/event","icon":"sparkles","tone":"3"},{"group":"Порівняння","title":"Порівняти людей","url":"/dateanalysis/compare/people","icon":"compare","tone":"2"},{"group":"Порівняння","title":"Порівняти події","url":"/dateanalysis/compare/events","icon":"layers","tone":"6"},{"group":"Порівняння","title":"Люди й події","url":"/dateanalysis/compare/mixed","icon":"grid","tone":"5"},{"group":"Довідка","title":"Системи аналізу","url":"/dateanalysis/systems","icon":"book","tone":"4"}]}}]},"visibleZones":["main"]}',
       updated_at = datetime('now')
 WHERE slug = 'dateanalysis'
   AND instr(page_data, '"type":"text"') > 0;
