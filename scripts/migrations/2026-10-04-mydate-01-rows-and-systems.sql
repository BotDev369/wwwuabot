-- MyDate: дати рядками + реєстр систем у базі (04.10.2026)
--
-- Було: дати — JSON у колонці `users.my_dates` (об’єкт `items` з масивом),
-- константа `DEFAULT_MYDATE_SYSTEMS` у коді з нашаруванням KV поверх неї.
-- Стало: `my_dates` (один рядок = одна дата) і `analysis_systems` (реєстр).
--
-- Чому. Дата — самостійна сутність: її сортує й фільтрує сам SQL, видаляється
-- одним DELETE (а не переписуванням усього масиву), і її видно адміні без
-- розбору чужого рядка користувача. Система — **дані**: додати її не повинно
-- означати правку коду й деплой; у коді лишається лише формула розрахунку.
--
-- Порядок виконання:
--   1. `ensureTables` створює `my_dates` і `analysis_systems` (реєстр таблиць),
--   2. ця міграція (INSERT), 3. деплой api-dev.
--   Між 1 і 3 старий код працює з JSON, новий — з рядків, тож обидва живі.
--
-- Скрипт **тільки додає**: INSERT, без DELETE/UPDATE/DROP. Повторний запуск
-- нічого не дублює (`INSERT OR IGNORE` за первинним ключем).
--
-- Звіт про пропущене:
--   * `users.my_dates`, які не є JSON-об'єктом із масивом `items`, не перенесені;
--     такий рядок лишається в `users` і нічого не втрачає — нові зміни вже йдуть
--     у `my_dates`.
--   * дати без номера або без дати пропущені: це не дата, а сміття у масиві.

-- ── Реєстр систем аналізу ───────────────────────────────────────────────────
-- Параметри — ті самі, що описували в константі: розрахунок не змінився,
-- змінилося місце, де його опис.
INSERT OR IGNORE INTO analysis_systems (id, name, description, position, parameters, is_active, implemented, updated_at)
VALUES (
  'western',
  'Західна астрологія',
  'Параметри на основі положення Сонця в зодіакальному колі.',
  10,
  '[{"key":"sunSign","label":"Знак Сонця"},{"key":"element","label":"Стихія"},{"key":"modality","label":"Якість (хрест)"},{"key":"ruler","label":"Управитель (сучасний)"},{"key":"traditionalRuler","label":"Традиційний управитель"},{"key":"decan","label":"Декан"},{"key":"degree","label":"Наближений градус Сонця"},{"key":"cusp","label":"Прикордонний знак"}]',
  1,
  1,
  datetime('now')
);

-- ── Дати: з JSON у рядки ────────────────────────────────────────────────────
-- `json_valid` відсікає сміття, `json_type(...) = 'object'` — лише форму
-- `{items:[…]}`, а фільтри нижче пропускають лише записи з номером і датою.
INSERT OR IGNORE INTO my_dates (user_id, id, date, type, name, tags, notes, created_at, updated_at)
SELECT
  u.user_id,
  json_extract(item.value, '$.id'),
  json_extract(item.value, '$.date'),
  CASE WHEN json_type(item.value, '$.type') = 'text' AND json_extract(item.value, '$.type') <> ''
    THEN json_extract(item.value, '$.type') ELSE 'other' END,
  CASE WHEN json_type(item.value, '$.name') = 'text' THEN json_extract(item.value, '$.name') ELSE '' END,
  CASE WHEN json_type(item.value, '$.tags') = 'array' THEN json_extract(item.value, '$.tags') ELSE '[]' END,
  CASE WHEN json_type(item.value, '$.notes') = 'text' THEN json_extract(item.value, '$.notes') ELSE '' END,
  CASE WHEN json_type(item.value, '$.created_at') = 'text'
    THEN json_extract(item.value, '$.created_at') ELSE datetime('now') END,
  CASE WHEN json_type(item.value, '$.updated_at') = 'text'
    THEN json_extract(item.value, '$.updated_at') ELSE datetime('now') END
FROM users u, json_each(u.my_dates, '$.items') AS item
WHERE json_valid(u.my_dates) = 1
  AND json_type(u.my_dates) = 'object'
  AND json_type(item.value, '$.date') = 'text'
  AND json_extract(item.value, '$.id') IS NOT NULL
  AND json_extract(item.value, '$.id') <> ''
  AND json_extract(item.value, '$.date') <> '';

-- Звіт: що перенесено, а що лишилося в `users.my_dates`.
--   SELECT COUNT(*) AS рядків_у_рядках FROM my_dates;
--   SELECT user_id FROM users
--    WHERE my_dates IS NOT NULL
--      AND json_valid(my_dates) = 1
--      AND json_type(my_dates) = 'object'
--      AND json_array_length(json_extract(my_dates, '$.items')) > 0
--      AND NOT EXISTS (SELECT 1 FROM json_each(my_dates, '$.items') i
--                       WHERE json_type(i.value, '$.date') = 'text'
--                         AND json_extract(i.value, '$.id') IS NOT NULL
--                         AND json_extract(i.value, '$.id') <> ''
--                         AND json_extract(i.value, '$.date') <> '');
