-- Заголовок екрана результатів: `props.title` → «Порівняння дат».
--
-- «Співставлення дат» — назва процесу, а цей екран показує результат: таблицю
-- порівняння. Змінюємо **одне поле в рядку контенту** (`json_set`), а не весь
-- `page_data`: решта блоку лишається недоторканою, повторний запуск безпечний.

UPDATE scenarios
SET page_data = json_set(page_data, '$.zones.main[0].props.title', 'Порівняння дат')
WHERE slug = 'mydate/compare/table';

SELECT changes() AS updated_rows;
