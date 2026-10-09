-- Головна сторінка «Аналіз дат»: вітрина замість робочого екрана.
--
-- Три блоки: вітрина (заголовок + провідний абзац), системи й дати. Ввід однієї
-- дати та кнопка «Показати аналіз» прибрані навмисно: дата заводиться в таблиці
-- («Нова дата»), і вона ж веде на аналіз — один шлях замість двох. Рядок той
-- самий, тож адреса не змінюється; правиться лише зона `main`. Повторний запуск
-- безпечний, а `analysis-systems` бере системи з реєстру `analysis_systems`.

UPDATE scenarios
SET page_data = json_set(
  page_data,
  '$.zones.main',
  json('[
    {
      "id": "dateanalysis-hero",
      "type": "hero",
      "order": 0,
      "props": {
        "title": "Зрозумій Себе. Зрозумій Інших. Зрозумій події.",
        "subtitle": "Аналіз дат з використанням 12+ систем світу: від давніх традицій до сучасних технологій",
        "align": "left"
      }
    },
    {
      "id": "dateanalysis-systems",
      "type": "analysis-systems",
      "order": 1,
      "props": { "title": "Системи аналізу" }
    },
    {
      "id": "dateanalysis-t",
      "type": "my-dates-table",
      "order": 2,
      "props": {}
    }
  ]')
),
    updated_at = datetime('now')
WHERE slug = 'dateanalysis'
  AND json_extract(page_data, '$.zones.main') IS NOT NULL;

-- Звіт: що тепер у головній сторінці розділу.
SELECT id, slug, title, json_extract(page_data, '$.zones.main[0].type') AS first_block,
       length(page_data) AS bytes
FROM scenarios
WHERE slug = 'dateanalysis';

SELECT changes() AS rows_touched;
