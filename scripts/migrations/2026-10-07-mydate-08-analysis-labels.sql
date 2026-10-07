-- «Аналіз Дат»: хедер екрана й підпис над таблицею.
--
-- Це **два різні поля**, і доти вони обидва казали назву кроку: хедер бере
-- `scenarios.title`, а підпис над таблицею — `props.title` блоку. Тепер хедер
-- каже, куди людина зайшла («Аналіз Дат»), а підпис — що вона бачить
-- («Результат аналізу:»).
--
-- UPDATE лише тих рядків, де блок той самий (`json_extract` за `id`): сторінку,
-- яку вже правили в адмінці, міграція не чіпає — застарілі підписи нормалізує
-- сам код (`mydateTitle`). Повторний запуск безпечний: значення ті самі.

-- ── Екран аналізу ───────────────────────────────────────────────────────────
UPDATE scenarios
SET title = 'Аналіз Дат',
    page_data = json_set(page_data, '$.zones.main[0].props.title', 'Результат аналізу:')
WHERE slug = 'mydate/analysis'
  AND json_extract(page_data, '$.zones.main[0].id') = 'mydate-analysis';

-- ── Той самий екран у рядку, що лишився від «співставлення» ─────────────────
-- Таблиця та сама (`date-analysis`), тож і підпис той самий; тип блоку
-- попередній (`compare-table`) лишає сторінку без компонента.
UPDATE scenarios
SET title = 'Аналіз Дат',
    page_data = json_set(
      page_data,
      '$.zones.main[0].type',
      'date-analysis',
      '$.zones.main[0].props.title',
      'Результат аналізу:'
    )
WHERE slug = 'mydate/compare/table'
  AND json_extract(page_data, '$.zones.main[0].id') = 'mydate-ct';

-- Звіт: хедер і підпис обох екранів.
SELECT slug, title, json_extract(page_data, '$.zones.main[0].props.title') AS caption
FROM scenarios
WHERE slug IN ('mydate/analysis', 'mydate/compare/table')
ORDER BY slug;
