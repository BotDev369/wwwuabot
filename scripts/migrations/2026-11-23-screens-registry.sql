-- Згенеровано з `packages/shared/src/screens/registry.json` — не правити руками.
-- Перегенерувати: `npm run doc:screens`; свіжість стереже `npm run check:screens`.
-- Ідемпотентно: ключ — ідентичність, повторний прогін оновлює той самий рядок.

INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('entry', NULL, 'Вхід',
        NULL, 0, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('day', NULL, 'Мій день',
        'sun', 10, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis', NULL, 'Аналіз людей і подій',
        'flask', 20, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('users', NULL, 'Гурт',
        'users', 30, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('account', NULL, 'Акаунт',
        'user-solid', 40, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('shops', NULL, 'Крамниці',
        'shop', 50, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('favorites', NULL, 'Обране',
        'heart', 60, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('trackers', NULL, 'Трекери',
        'bar-chart', 70, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('notes', NULL, 'Нотатки',
        'text', 80, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('contacts', NULL, 'Контакти',
        'contact', 90, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('messages', NULL, 'Повідомлення',
        'message-square', 100, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('orders', NULL, 'Замовлення',
        'clipboard', 110, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('services', NULL, 'Сервіси',
        'layers', 120, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('ads', NULL, 'Оголошення',
        'announce', 130, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('games', NULL, 'Ігри',
        'game', 140, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('games.play', 'games', 'Партія',
        NULL, 0, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('research', NULL, 'Дослідження',
        'book', 150, 1, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.variants', 'analysis', 'Варіанти головної',
        NULL, 10, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.hub.1', 'analysis', 'Головна · варіант 1',
        NULL, 11, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.hub.2', 'analysis', 'Головна · варіант 2',
        NULL, 12, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.hub.3', 'analysis', 'Головна · варіант 3',
        NULL, 13, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.systems', 'analysis', 'Про системи аналізу',
        NULL, 20, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.tests', 'analysis', 'Пройти тестування',
        NULL, 30, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.test', 'analysis.tests', 'Тест',
        NULL, 0, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.qualities', 'analysis', 'Типові якості людей і подій',
        NULL, 40, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.people', 'analysis', 'Люди і події',
        NULL, 50, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.match', 'analysis', 'Підбір ролі',
        NULL, 60, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.person', 'analysis', 'Аналізувати за датою',
        NULL, 70, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.person.systems', 'analysis.person', 'Хто читає дату?',
        NULL, 0, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.person.result', 'analysis.person', 'Результат',
        NULL, 1, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.event', 'analysis', 'Аналізувати подію',
        NULL, 80, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.event.systems', 'analysis.event', 'Хто читає дату?',
        NULL, 0, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.event.result', 'analysis.event', 'Результат',
        NULL, 1, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.compare', 'analysis', 'Співставити',
        NULL, 90, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.compare.systems', 'analysis.compare', 'Хто читає дату?',
        NULL, 0, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('analysis.compare.result', 'analysis.compare', 'Результат співставлення',
        NULL, 1, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('scenarios.products', 'shops', 'Товари',
        NULL, 0, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('scenarios.product.new', 'scenarios.products', 'Новий товар',
        NULL, 0, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('scenarios.product', 'scenarios.products', 'Товар',
        NULL, 1, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('scenarios.orders', 'shops', 'Замовлення крамниці',
        NULL, 10, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;
INSERT INTO platform_screens
  (key, parent_key, title, icon, sort_order, in_menu, is_active, updated_at)
VALUES ('scenarios.order', 'scenarios.orders', 'Замовлення',
        NULL, 0, 0, 1, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  parent_key = excluded.parent_key,
  title = excluded.title,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  in_menu = excluded.in_menu,
  updated_at = excluded.updated_at;

UPDATE platform_screens
   SET page_data = (
         SELECT page_data FROM platform_pages
          WHERE platform_pages.slug = platform_screens.key
       )
 WHERE page_data IS NULL
   AND EXISTS (
         SELECT 1 FROM platform_pages
          WHERE platform_pages.slug = platform_screens.key
       );

SELECT key, parent_key, title, in_menu, length(page_data) AS bytes
  FROM platform_screens ORDER BY sort_order, key;
