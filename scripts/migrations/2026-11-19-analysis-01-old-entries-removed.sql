-- Старі сім входів «Аналізу» видалені: у фічі тепер власна головна /analysis.
--
-- Було: сторінка `dateanalysis` з картками входів і дочірні сторінки
-- (`self`, `person`, `event`, `compare/*`, `systems`). Кожна несла свій блок
-- налаштувань, і жодна не була головною фічі.
-- Стало: `/analysis` — маршрут платформи, стан проходження їде адресою.
--
-- Рядки видаляються, а не ховаються: посилань на них у продукті більше немає.
-- Таблиця — `platform_pages`, а не `scenarios`: розділення
-- `2026-11-12-split-scenarios.sql` лишило сторінки саме тут. Рядок бота з тим
-- самим `lookup` теж прибирається, якщо він є (його може не бути — тоді DELETE
-- нічого не робить).
--
-- Ідемпотентно: DELETE за адресою, повторний запуск нічого не змінює.

DELETE FROM platform_pages
 WHERE slug = 'dateanalysis'
    OR slug LIKE 'dateanalysis/%';

DELETE FROM bot_scenarios
 WHERE lookup = 'dateanalysis'
    OR lookup LIKE 'dateanalysis/%';
