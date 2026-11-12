# Бот на віджетах: робочі нотатки (12.11.2026)

Чернетка рішень до перебудови бота на Bot API 10.4. Це не документ продукту:
спільна пам'ять до обговорення. Після рішень частина переїде в `docs/`.

## 1. Рішення (зафіксовано)

- Бот більше **не пов'язаний зі сторінками платформи**. Жодного `page_slug`,
  жодного JOIN з `platform_pages`. `/start` — це сценарій бота, головна
  сторінка платформи — окрема річ.
- Контент бота — те, що написано руками в сценаріях, плюс те, що генерується
  динамічно.
- **Два типи повідомлень**, кнопки в тілі в обох:
  - `widget` — типовий варіант для приватного чату з користувачем;
  - `rich` — службовий, для груп і топіків, де віджетів у проді немає;
    мінімалізм, лише потрібне.
- Рядок сценарію містить **один** тип: або віджет, або rich.
- Фото у віджеті — без зовнішніх URL; поки без фото, за потреби — дрібна
  вбудована картинка (`data:`/SVG), якщо влізе в 4 КБ стисненого HTML.
- Пошук — **одне поле `lookup`**, значення пишеться як отримано, без обробки.
  Регістр — точний (окремі випадки обговоримо пізніше).
- Усе старе видаляємо одразу: дані, поля, код, що читає старі колонки.

## 2. Перевірено: автоматичної помилки для старого клієнта немає

Офіційний spec (репозиторій TelegramMessenger/widget-sandbox, tgw-format):

> «The server has no flag for widgets: each client enables rendering itself, by
> platform and version (a debug or rollout flag on the client side).»

> «Clients below layer 233 receive messageMediaUnsupported with the caption text
> and show their usual placeholder; a new client keeps that fallback for
> messages it decides not to render.»

`sendWidget` повертає `ok` і `Message`, помилки є лише на реальні збої API
(HTML > 32768 байт або > 4096 після zlib, невалідний HTML, група/канал, ліміти,
flood). Отже:

- фолбек «старий девайс → rich» технічно неможливий;
- єдиний реальний перехід «віджет → rich» — **за типом чату**: у проді
  `sendWidget` працює лише в приватному чаті, групи й топіки — ні;
- rich-повідомлення на старих клієнтах теж показуються як unsupported, тож
  ланцюжок не врятує старі прошивки — це треба прийняти.

Підпис віджета (`caption`) показується навіть на старих клієнтах — тому він
має бути самодостатнім.

## 3. Структура `bot_scenarios`

```sql
CREATE TABLE IF NOT EXISTS "bot_scenarios" (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- ключ пошуку як отримано: '/start', 'dateanalysis', callback-data, текст
  lookup TEXT NOT NULL UNIQUE,
  -- один тип на рядок
  kind TEXT NOT NULL CHECK (kind IN ('widget', 'rich')),
  -- варіант widget
  widget_html TEXT,
  widget_data TEXT,                 -- початковий chat_data, до 1024 байт
  -- варіант rich (кнопки в тілі: <tg-button-row>)
  rich_html TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (
    (kind = 'widget' AND widget_html IS NOT NULL AND length(trim(widget_html)) > 0)
    OR
    (kind = 'rich' AND rich_html IS NOT NULL AND length(trim(rich_html)) > 0)
  )
);
```

Стан віджетів (який віджет зараз у чаті й що в ньому натиснули) — окрема
таблиця: `bot_widget_messages(user_id, message_id, widget_id, lookup, chat_data,
updated_at)`.

Прибираємо з поточної таблиці все: `slug`, `bot_command`, `page_slug`-ідею,
`photo_url`, `caption_*`, `keyboard_type`, `buttons`, `awaits_input`,
`input_path`, `input_next`, `price`, `qty_options`, `notify_groups`,
`notify_template`, `rich_message`, `rich_data`. Нотифікації в групи — окремий
механізм, не поле екрана.

## 4. Бренд

- Назва: **ПАЛЯНИЦЯ**
- Підпис: **ділова платформа для Своїх**
- Бот: `@PalyanytsiaPlatformBot` (уже перейменований у Telegram)
- Логотип: круглий хліб (іконка бота вже стоїть)

Питання: бренд міняємо лише в контенті бота й текстах, чи тягнемо далі —
домени, назви пакетів (`@wwwuabot/*`), заголовки платформи?

## 5. Відкриті питання

1. Обсяг бренду (див. вище).
2. Нотифікації в групи: окремий rich-механізм залишаємо?
3. Діалог з адміном для людини без допуску — rich зі звичайним текстом
   (єдиний виняток) чи Mini App?
4. Черговість: спершу каркас бота (`/start`, навігація, допуск, запрошення),
   потім службові групи й нотифікації.
5. Чи переносимо `bot_widget_messages` у `users` (стовпець `widget_message_id`
   уже є як `message_id`)?

## 6. Порядок робіт

1. Нова схема + міграція (DROP старої таблиці, CREATE нової), застосування до
   `wwwuabot-db-dev`.
2. Транспорт: `sendWidget`, `answerWidgetQuery`, `editMessageWidgetData` через
   `fetch`; перехоплення `widget_query` до grammy; `allowed_updates`.
3. Рендерер rich із кнопками в тілі; рендерер віджета; сторож 4 КБ у CI.
4. `lookup`-репозиторій і роутер: `/start`, callback, текст — точний збіг.
5. Перевести потоки: навігація, допуск, запрошення, діалог з адміном.
6. Адмінка: редактор `lookup` + `kind` + HTML/JSON.
7. Видалити старий код, оновити доки, гейти, деплой, живі перевірки.
