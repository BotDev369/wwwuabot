-- Головна сторінка розділу: входи картками, без бібліотеки дат.
--
-- Було: hero + сітка кнопок + абзац-пояснення + таблиця «Дати». Плитки
-- ламались на рядки різної ширини, hero повторював заголовок сторінки, абзац
-- переказував те, що має казати кожен вхід, а бібліотека дат стояла на вході,
-- хоч вона й потрібна всередині кроку.
-- Стало: один провідний рядок і картки-входи з реченням на кожну.
--
-- Ідемпотентно: умова — наявність hero, а не `updated_at` і не id блока
-- (`dateanalysis-entries` уже носила попередня сітка кнопок).

UPDATE scenarios
   SET page_data = '{"version":1,"zones":{"sidebar":[],"header":[],"footer":[],"main":[{"id":"dateanalysis-lead","type":"text","order":0,"props":{"content":"Один розрахунок — два прочитання. Людина читається як характер, подія — як тон, рушій і наслідок.","level":"body"}},{"id":"dateanalysis-entries","type":"analysis-entries","order":1,"props":{"items":[{"group":"Один субʼєкт","title":"Аналізувати себе","lead":"Характер, ресурси, слабкі місця — з вашої дати.","url":"/dateanalysis/self"},{"group":"Один субʼєкт","title":"Аналізувати інших","lead":"Характер людини за її датою народження.","url":"/dateanalysis/person"},{"group":"Один субʼєкт","title":"Аналізувати подію","lead":"Тон, рушій і наслідок за датою події.","url":"/dateanalysis/event"},{"group":"Порівняння","title":"Порівняльний аналіз людей","lead":"Дві й більше люди: спільне, різне, напруга.","url":"/dateanalysis/compare/people"},{"group":"Порівняння","title":"Порівняльний аналіз подій","lead":"Кілька подій поруч: спільний тон чи різний.","url":"/dateanalysis/compare/events"},{"group":"Порівняння","title":"Порівняння людей і подій","lead":"Людина й подія в одній таблиці.","url":"/dateanalysis/compare/mixed"},{"group":"Довідка","title":"Системи аналізу","lead":"Що рахується, а що ще в роботі.","url":"/dateanalysis/systems"}]}}]},"visibleZones":["main"]}',
       updated_at = datetime('now')
 WHERE slug = 'dateanalysis'
   AND instr(page_data, '"type":"hero"') > 0;
