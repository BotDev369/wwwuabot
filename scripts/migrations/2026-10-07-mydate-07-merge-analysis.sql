-- «Аналіз Дат»: назви екранів і типи блоків після об'єднання аналізу й співставлення.
--
-- Аналіз і співставлення стали одним функціоналом: дат може бути одна або
-- більше, а таблиця — та сама (`date-analysis`). Код уже читає обидві адреси, тож
-- ця міграція лише прибирає з рядків те, що лишилось від двох процесів: назву в
-- хедері (`title`) і тип блоку в `page_data`.
--
-- UPDATE лише тих рядків, де блок той самий (`json_extract` за `id`): якщо
-- сторінку вже правили в адмінці, рядок лишається недоторканим — нормалізацію
-- підписів код робить сам (`mydateTitle`), і екран від цього не ламається.
-- Повторний запуск безпечний: значення ті самі.

-- ── Екран аналізу ───────────────────────────────────────────────────────────
UPDATE scenarios
SET title = 'Аналіз Дат',
    page_data = json_set(
      page_data,
      '$.zones.main[0].props',
      json('{"title":"Аналіз Дат","backUrl":"/mydate","targetUrl":"/mydate/analysis"}')
    )
WHERE slug = 'mydate/analysis'
  AND json_extract(page_data, '$.zones.main[0].id') = 'mydate-analysis';

-- ── Крок вибору систем (був окремим процесом) ───────────────────────────────
UPDATE scenarios
SET title = 'Аналіз Дат',
    page_data = json_set(
      page_data,
      '$.zones.main[0].type',
      'date-analysis',
      '$.zones.main[0].props',
      json('{"title":"Аналіз Дат","backUrl":"/mydate","targetUrl":"/mydate/analysis"}')
    )
WHERE slug = 'mydate/compare/systems'
  AND json_extract(page_data, '$.zones.main[0].id') = 'mydate-csys';

-- ── Таблиця результатів ─────────────────────────────────────────────────────
UPDATE scenarios
SET title = 'Аналіз Дат',
    page_data = json_set(
      page_data,
      '$.zones.main[0].type',
      'date-analysis',
      '$.zones.main[0].props',
      json('{"title":"Аналіз Дат","backUrl":"/mydate","targetUrl":"/mydate/analysis"}')
    )
WHERE slug = 'mydate/compare/table'
  AND json_extract(page_data, '$.zones.main[0].id') = 'mydate-ct';

-- ── Ручне введення дат ──────────────────────────────────────────────────────
UPDATE scenarios
SET title = 'Аналіз Дат',
    page_data = json_set(
      page_data,
      '$.zones.main[0].props.title',
      'Аналіз Дат',
      '$.zones.main[0].props.nextUrl',
      '/mydate/analysis'
    )
WHERE slug = 'mydate/compare/setup'
  AND json_extract(page_data, '$.zones.main[0].id') = 'mydate-cs';

-- Звіт: що саме змінилось.
SELECT slug, title, json_extract(page_data, '$.zones.main[0].type') AS block
FROM scenarios
WHERE slug LIKE 'mydate%'
ORDER BY slug;
