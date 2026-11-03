-- «Аналіз дат» → «Аналіз людей та подій»: розділення предмета (03.11.2026)
--
-- Було: один вхід — дата. Дата народження, дата події й дата чужої людини
-- читались одним словником, тож подія отримувала опис характеру, а таблиця
-- не знала, кого в ній порівнюють.
--
-- Стало: сім входів, і кожен каже, **що** читаємо. Головна сторінка розділу —
-- перелік входів, а не таблиця дат; далі скрізь той самий крок «суб'єкт»
-- (імʼя + дата) і той самий екран результату, але зі словником свого виду:
-- людина читається як характер, подія — як тон, рушій і наслідок.
--
-- Тому `dateanalysis` лишається адресою розділу: її тримають футер, бот і
-- збережені посилання, і перейменування оплачувалось би аліасами заради слова.
-- Правиться назва й вміст, а не адреса.
--
-- Старий `dateanalysis/compare` стає `dateanalysis/compare/people`: це той
-- самий екран порівняння, лише з названим предметом. Стара адреса лишається
-- аліасом, тож збережене посилання відкриває ту саму сторінку.
--
-- Скрипт ідемпотентний: `INSERT ... WHERE NOT EXISTS` не плодить дублів, а
-- повторний запуск нічого не переписує. `DELETE`/`DROP` тут немає.

-- ── 1. Головна сторінка розділу ─────────────────────────────────────────────
UPDATE scenarios
SET title = 'Аналіз людей та подій',
    caption_top = 'Кого читаємо? Людину — як характер, подію — як тон і наслідок.',
    buttons = json('[
      [{"text":"Аналізувати себе","callback_data":"dateanalysis/self"},
       {"text":"Аналізувати інших","callback_data":"dateanalysis/person"}],
      [{"text":"Аналізувати події","callback_data":"dateanalysis/event"}],
      [{"text":"Порівняти людей","callback_data":"dateanalysis/compare/people"},
       {"text":"Порівняти події","callback_data":"dateanalysis/compare/events"}],
      [{"text":"Порівняти людей і події","callback_data":"dateanalysis/compare/mixed"}],
      [{"text":"Системи аналізу","callback_data":"dateanalysis/systems"}],
      [{"text":"Сайт «Аналіз людей та подій»","web_app":{"url":"https://web-platform-dev.diskomate.workers.dev/dateanalysis"}}]
    ]'),
    page_data = json_set(
      page_data,
      '$.zones.main',
      json('[
        {
          "id": "dateanalysis-hero",
          "type": "hero",
          "order": 0,
          "props": {
            "title": "Аналіз людей та подій",
            "subtitle": "Один розрахунок — два прочитання. Людина: характер, ресурси, слабкі місця. Подія: тон, рушій і те, чим вона завершується."
          }
        },
        {
          "id": "dateanalysis-entries",
          "type": "buttons",
          "order": 1,
          "props": {
            "items": [
              { "text": "Системи аналізу", "url": "/dateanalysis/systems", "variant": "outline" },
              { "text": "Аналізувати себе", "url": "/dateanalysis/self", "variant": "primary" },
              { "text": "Аналізувати інших", "url": "/dateanalysis/person", "variant": "secondary" },
              { "text": "Аналізувати події", "url": "/dateanalysis/event", "variant": "secondary" },
              { "text": "Порівняльний аналіз людей", "url": "/dateanalysis/compare/people", "variant": "outline" },
              { "text": "Порівняльний аналіз подій", "url": "/dateanalysis/compare/events", "variant": "outline" },
              { "text": "Порівняльний аналіз людей і подій", "url": "/dateanalysis/compare/mixed", "variant": "outline" }
            ]
          }
        },
        {
          "id": "dateanalysis-how",
          "type": "text",
          "order": 2,
          "props": {
            "level": "body",
            "content": "Предмет аналізу обирає сторінка, а не таблиця. Тому той самий знак Сонця для людини означає риси вдачі, а для події — те, на чому вона тримається. Формула одна: різняться тексти, а не розрахунок."
          }
        },
        {
          "id": "dateanalysis-t",
          "type": "my-dates-table",
          "order": 3,
          "props": { "showSearch": true, "showTypeFilter": true, "showBulkActions": true, "showCreateButton": true }
        }
      ]')
    ),
    updated_at = datetime('now')
WHERE slug = 'dateanalysis'
  AND page_data IS NOT NULL
  -- Умова на новий блок, а не на `updated_at`: без неї повторний запуск
  -- переписував би рядок щопрогону й дата зміни переставала б щось означати.
  AND json_extract(page_data, '$.zones.main[1].id') IS NOT 'dateanalysis-entries';

-- ── 2. Порівняння людей: стара адреса стає названою ─────────────────────────
UPDATE scenarios
SET slug = 'dateanalysis/compare/people',
    title = 'Порівняння людей',
    page_data = json_set(
      page_data,
      '$.zones.main',
      json('[
        {
          "id": "dateanalysis-people-cs",
          "type": "compare-setup",
          "order": 0,
          "props": {
            "title": "Порівняння людей",
            "kind": "person",
            "maxDates": 10,
            "nextUrl": "/dateanalysis/analysis"
          }
        }
      ]')
    ),
    updated_at = datetime('now')
WHERE slug = 'dateanalysis/compare'
  AND NOT EXISTS (SELECT 1 FROM scenarios WHERE slug = 'dateanalysis/compare/people');

INSERT OR IGNORE INTO slug_aliases (alias, slug)
VALUES ('dateanalysis/compare', 'dateanalysis/compare/people');

-- Старі аліаси вели на `dateanalysis/compare` — адресу, яка щойно переїхала.
-- Аліас веде на **живий** рядок (`redirectTargetFor` джойнить `scenarios`), тож
-- без цієї правки `/dateanalysis/compare/setup` почав би віддавати 404.
UPDATE slug_aliases
   SET slug = 'dateanalysis/compare/people'
 WHERE slug = 'dateanalysis/compare';

-- Результат більше не «аналіз дат»: у заголовку вкладки стоїть те, що людина
-- справді отримала. Адреса й блок лишаються тими самими.
UPDATE scenarios
   SET title = 'Результат аналізу',
       updated_at = datetime('now')
 WHERE slug = 'dateanalysis/analysis'
   AND title <> 'Результат аналізу';

-- ── 3. Решта входів ─────────────────────────────────────────────────────────
-- Один блок на сторінку: питання «кого/що читаємо» вже задане адресою, тож
-- дублювати його текстом не треба.
INSERT INTO scenarios (slug, title, caption_top, page_data)
SELECT 'dateanalysis/systems', 'Системи аналізу',
       'Дванадцять систем: що кожна міряє і звідки взялася.',
       '{"version":1,"visibleZones":["main"],"zones":{"sidebar":[],"header":[],"main":[{"id":"dateanalysis-systems","type":"analysis-systems","order":0,"props":{"title":"Системи аналізу"}}],"footer":[]}}'
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE slug = 'dateanalysis/systems');

INSERT INTO scenarios (slug, title, caption_top, page_data)
SELECT 'dateanalysis/self', 'Аналіз себе',
       'Ваш характер і ресурси: кілька систем одразу.',
       '{"version":1,"visibleZones":["main"],"zones":{"sidebar":[],"header":[],"main":[{"id":"dateanalysis-self-cs","type":"compare-setup","order":0,"props":{"title":"Аналіз себе","kind":"person","selfMode":true,"maxDates":1,"nextUrl":"/dateanalysis/analysis"}}],"footer":[]}}'
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE slug = 'dateanalysis/self');

INSERT INTO scenarios (slug, title, caption_top, page_data)
SELECT 'dateanalysis/person', 'Аналіз іншої людини',
       'Людина читається як характер: сильні й слабкі сторони.',
       '{"version":1,"visibleZones":["main"],"zones":{"sidebar":[],"header":[],"main":[{"id":"dateanalysis-person-cs","type":"compare-setup","order":0,"props":{"title":"Аналіз іншої людини","kind":"person","maxDates":1,"nextUrl":"/dateanalysis/analysis"}}],"footer":[]}}'
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE slug = 'dateanalysis/person');

INSERT INTO scenarios (slug, title, caption_top, page_data)
SELECT 'dateanalysis/event', 'Аналіз події',
       'Подія читається як тон, рушій і наслідок — не як характер.',
       '{"version":1,"visibleZones":["main"],"zones":{"sidebar":[],"header":[],"main":[{"id":"dateanalysis-event-cs","type":"compare-setup","order":0,"props":{"title":"Аналіз події","kind":"event","maxDates":1,"nextUrl":"/dateanalysis/analysis"}}],"footer":[]}}'
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE slug = 'dateanalysis/event');

INSERT INTO scenarios (slug, title, caption_top, page_data)
SELECT 'dateanalysis/compare/events', 'Порівняння подій',
       'Кілька подій поруч: де тон спільний, а де різний.',
       '{"version":1,"visibleZones":["main"],"zones":{"sidebar":[],"header":[],"main":[{"id":"dateanalysis-events-cs","type":"compare-setup","order":0,"props":{"title":"Порівняння подій","kind":"event","maxDates":10,"nextUrl":"/dateanalysis/analysis"}}],"footer":[]}}'
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE slug = 'dateanalysis/compare/events');

INSERT INTO scenarios (slug, title, caption_top, page_data)
SELECT 'dateanalysis/compare/mixed', 'Порівняння людей і подій',
       'Люди й події в одній таблиці: у кожного рядка свій вид.',
       '{"version":1,"visibleZones":["main"],"zones":{"sidebar":[],"header":[],"main":[{"id":"dateanalysis-mixed-cs","type":"compare-setup","order":0,"props":{"title":"Порівняння людей і подій","kind":"mixed","maxDates":10,"nextUrl":"/dateanalysis/analysis"}}],"footer":[]}}'
WHERE NOT EXISTS (SELECT 1 FROM scenarios WHERE slug = 'dateanalysis/compare/mixed');

-- ── 4. Звіт ─────────────────────────────────────────────────────────────────
SELECT slug, title, json_extract(page_data, '$.zones.main[0].type') AS перший_блок
  FROM scenarios
 WHERE slug = 'dateanalysis' OR slug LIKE 'dateanalysis/%'
 ORDER BY slug;

SELECT alias, slug AS веде_на FROM slug_aliases WHERE alias LIKE 'dateanalysis/%';
