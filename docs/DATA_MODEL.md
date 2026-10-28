# Модель даних D1: одна таблиця — один власник

**Джерело правди:** `packages/shared/src/database/tables.ts` (реєстр) · **гейт:** `npm run check:db`
· **міграції:** `scripts/migrations/` · **контент:** [`CONTENT_MODEL.md`](./CONTENT_MODEL.md)

DDL не живе в контролерах і репозиторіях: кожна таблиця оголошена **один раз** у реєстрі — ім'я,
власник, призначення, `CREATE TABLE`. Створити таблицю повз нього не дасть гейт. Як схему міняти —
[`D1_OPS.md`](./D1_OPS.md).

**Власник** — воркер, який створює таблицю. Інші можуть читати, але не вигадують схему: колонка
додається рядком у реєстрі, а не `ALTER`-ом із обробника помилки.

## Таблиці

| Таблиця | Власник | Хто створює | Хто читає / пише | Призначення |
|---|---|---|---|---|
| `users` | `bot-dev` | bot-dev, `createUser` | bot-dev (стан, профіль, блокування, `telegram_json`); api-dev (адмін-CRUD, `/api/user/profile`, `platform_username`, `my_dates`, публічний профіль — `photo_url` / `about` / `profile_public*`) | стан користувача Telegram: профіль, роль, тариф, блокування, **ім'я на платформі**. Профіль і видимість — [`VISIBILITY.md`](./VISIBILITY.md). `created_at` ставить `createUser`: у живій базі колонка `NOT NULL` без значення за замовчуванням, а `ensureTables` констрейнтів не переписує |
| `settings` | `bot-dev` | bot-dev, `SettingsRepository.initialize` | bot-dev | один рядок (`id = 1`): `chat_id` груп, прапорець активності |
| `scenarios` | `api-dev` | api-dev (`ensureBase`, `scenarios-portal.controller`) | **bot-dev читає**; api-dev редагує (`/api/portal/scenarios/*`, сторінки людини — `/api/user/pages`); платформа рендерить (`/api/scenario/:slug`) | **єдине сховище контенту:** рядок = сторінка вебу (`page_data`) + її подання в боті (`caption_*`, `buttons`, `rich_*`). Сторінка людини — той самий рядок із `owner_id`/`admin_ids`/`is_public`/`template_key` ([`PAGES.md`](./PAGES.md)) |
| `favorites` | `api-dev` | api-dev (`ensureTables` у `favorites.controller`) | api-dev: `/api/favorites` | особисті лайки: лише посилання на сутність, назва й доступ перевіряються при читанні ([`FAVORITES.md`](./FAVORITES.md)) |
| `user_events` | `api-dev` | api-dev (`ensureTables` у спільному `recordUserEvent`); **bot-dev пише** тим самим `recordUserEvent` | адмінка: `/api/admin/events`, `/api/admin/events/summary` | **журнал дій людей:** рядок на дію — `surface` (бот / платформа), `kind`, `action` (текст, `callback_data` або `METHOD /api/…`), `status`. Імена не копіюються — беруться `JOIN`-ом із `users`. Правила — [`EVENTS.md`](./EVENTS.md) |
| `trackers` | `api-dev` | api-dev (`ensureTables` у `trackers.controller`) | api-dev: `/api/user/trackers` | трекери людини: один ряд «мірка → запис» на всі мірки (`unit`, `step`, `goal`, межі), `priority` — ранг 1–9 (`NULL` — не заданий), `source` — звідки копія, `is_public` — визначення відкрите іншим, `position` — порядок серед сусідів ([`TRACKERS.md`](./TRACKERS.md)) |
| `tracker_entries` | `api-dev` | api-dev (`ensureTables` у `trackers.controller`) | api-dev: `/api/user/trackers/entry` | дотики: рядок на день, число й момент запису (`logged_at`); записів за день може бути багато, аналітика бере їх суму; `owner_id` — для читання стрічки одним запитом |
| `access_requests` | `api-dev` | api-dev, `ensureTables` у `access-request.controller` та `access-requests-admin.controller`; **bot-dev** — `modules/access/contact/flow` | api-dev; **bot-dev пише** зверження з чату | **повідомлення адміну** — зі сторінки відмови **або з діалогу в чаті** (`bot-dev`): `user_id` — обов'язковий Telegram-id (на платформі з підписаного `initData`, у чаті — `ctx.from`). Єдиний шлях поза гейтом допуску, який **пише**. Незавершена чернетка — не тут, а в `users.admin_dialog_text`. З панелі — повний CRUD під `/api/admin/access-requests`: правиться лише текст, автора не рухають |
| `notes` | `api-dev` | api-dev (`ensureTables` у `notes.controller`) | api-dev: платформа — `/api/notes`, панель — `/api/admin/notes` | нотатки: чернетки людини (`scope = 'user'`, власник — Telegram-id із **підписаного `initData`**) і нотатки про проєкт з панелі (`scope = 'admin'`, власник — акаунт cookie-сесії). `tags` — JSON-масив |
| `contacts` | `api-dev` | api-dev (`ensureTables` у `contacts.controller`) | api-dev: довідник — `/api/contacts`; **bot-dev пише вхід у бота та `username`**, **api-dev — вхід на платформу** | контакти людини: **один рядок = один контакт**, а лінк — **одне з його полів** (`code` з `UNIQUE`, це і є payload бота `inv-8f3k2q`). `username` пише бот, `owner_id` — Telegram-id із **підписаного `initData`**. Правила — [`COLLECTIONS.md`](./COLLECTIONS.md) |
| `conversations` | `api-dev` | api-dev (`ensureTables` у `messages.controller`) | api-dev: `/api/messages` | переписка людей; модель і правила — [`MESSAGES.md`](./MESSAGES.md) |
| `messages` | `api-dev` | api-dev (`ensureTables` у `messages.controller`) | api-dev: `/api/messages/*` | повідомлення розмови; схема й поведінка — [`MESSAGES.md`](./MESSAGES.md) |
| `message_media` | `api-dev` | api-dev, `ensureTables` у `services/messages/schema.ts` | api-dev: завантаження — `/api/messages/media`, сам файл — `/api/messages/media/<…>` | облік фото переписки; байти в R2 — [`MESSAGES.md`](./MESSAGES.md) |
| `message_drafts` | `api-dev` | api-dev (`ensureTables` у `messages.controller`) | api-dev: `/api/messages/compose`, `/api/messages/draft` | приватні чернетки переписки — [`MESSAGES.md`](./MESSAGES.md) |
| `ads` | `api-dev` | api-dev (`ensureTables` у `ads.service`) | api-dev: своє — `/api/user/ads`, дошка — `/api/public/ads` | **оголошення дошки:** вид, заголовок, текст, ціна й місто (обидва — **текст**). `is_active` — не «чи опубліковано», а **показати на дошці**: вимкнене лишається в списку власника чернеткою. Правила — [`ADS.md`](./ADS.md) |
| `theme_schemes` | `api-dev` | api-dev, `ensureTables` | api-dev: своє — `/api/user/themes`, спільна — `/api/public/themes` | **теми**: три кольори + шрифт; `is_public` виносить тему в спільну бібліотеку ([`THEMES.md`](./THEMES.md)) |
| `shop_products` | `api-dev` | api-dev, `ensureTables` у `services/shop/shops.ts` | api-dev: своє — `/api/user/shop/products`, каталог — `/api/public/shop/products` | **товар магазину:** `shop_id` — **номер рядка `scenarios`** (магазин і є сторінка), `slug` унікальний **у межах магазину**, `kind` — ключ із `PRODUCT_KINDS`, `price` — **текст**, `images` — номери `shop_media`, `category` — **розділ каталогу назвою**. Правила — [`PRODUCTS.md`](./PRODUCTS.md) |
| `shop_media` | `api-dev` | api-dev, `ensureTables` у `services/shop/shops.ts` | api-dev: своє — `/api/user/shop/media`, сам файл — `/api/shop/media/<…>` | **облік файлів R2:** рядок на файл, `r2_key` = `shop/<shop_id>/<випадкове>-<ім'я>` (`UNIQUE` — два облікові рядки на один файл зробили б ключ мертвим при видаленні одного з них). Байти — в R2, тут — ключ: товар посилається на **номери рядків** |
| `shop_orders` | `api-dev` | api-dev, `ensureTables` у `services/shop/shops.ts` | api-dev: замовлення — `/api/public/shop/orders`, черга продавця — `/api/user/shop/orders` (`GET`/`POST`/`DELETE`) | **замовлення магазину:** `status` — **ключ**, а не підпис (перейменування статусу не має переписувати історію), `contact` — JSON (склад полів залежить від виду товару), `note` — **примітка покупця**, `seller_note` — **внутрішній коментар продавця** (покупцеві його не показують — про це каже розмова), позиції — знімком поруч. Замовлення не живе ні в `users`, ні в тексті листування |
| `shop_order_items` | `api-dev` | api-dev, `ensureTables` у `services/shop/shops.ts` | api-dev: позиції пише й читає `services/shop/orders.service.ts` (окремого шляху в них немає — вони частина замовлення) | **знімок позиції:** `title`, `price`, `kind` **копіюються** на момент замовлення — інакше правка ціни заднім числом переписувала б історію, а видалений товар зникав би з уже прийнятого замовлення. `product_id` лишається посиланням, і `NOT NULL` у нього немає |
| `shop_order_statuses` | `api-dev` | api-dev, `ensureTables` у `services/shop/shops.ts` | api-dev: `/api/user/shop/statuses` | **лише відхилення від типових** (`DEFAULT_ORDER_STATUSES` у коді): перейменування (той самий ключ, свій підпис), вимкнення (`is_active = 0`) і власні статуси. Статус не видаляють — **вимикають**: підпис потрібен і для старих замовлень |
| `mydate_analysis` | `api-dev` | api-dev, `getAnalysis` | api-dev | кеш астрологічного аналізу на дату (KV — швидкий шар) |
| `my_dates` | `api-dev` | api-dev, `ensureMyDatesSchema` у `services/my-dates.service.ts` | api-dev: `/api/my-dates` (`GET`/`POST`/`PUT`/`DELETE`) | **дати людини — рядками**, а не JSON-ом у `users`: ключ `(user_id, id)`, `date` — рядок `рррр-мм-дд`, бо його порівнює й сортує сам SQL. Кожна зміна б'є в один рядок, тому два записи з фронтенду не заглибнуть один на одний. `type` — **власне слово людини**, а не ключ із переліку ([`GLOSSARY.md`](./GLOSSARY.md) — «Вид товару» пояснює, чому перелік не замикає) |
| `analysis_systems` | `api-dev` | api-dev, `ensureTables` | api-dev: `/api/mydate/systems` | **системи аналізу — дані, а не код**: `parameters` — JSON, `position` — порядок, `implemented` — «є формула». Додати систему можна рядком у базі, без деплою |
| `assessment_results` | `api-dev` | api-dev, `ensureTables` у `assessments.controller` | api-dev: `/api/user/assessments` (проходження, історія, а разом з ними й анонімний розподіл `peers`) | **результат самооцінки — рядок на шкалу:** бал зберігається **разом із відповідями**, а `raw` / `percent` / `band_key` / `needs_attention` — **знімки на момент проходження**, тож зміна шкали чи порога не переписує минуле. Власник стоїть у `WHERE` кожного читання ([`ASSESSMENTS.md`](./ASSESSMENTS.md), [`ASSESSMENT_PEERS.md`](./ASSESSMENT_PEERS.md)) |
| `metrics_snapshots` | `api-dev` | api-dev, `ensureTables` у `store.ts` | api-dev: `/api/admin/monitoring/summary`, `collect` і `scheduled` | зріз моніторингу проєкту: коли зібрано, ручний він чи за розкладом, стан, коміт і звіт колекторів |
| `metrics_values` | `api-dev` | api-dev, `ensureTables` у `store.ts` | api-dev — ті самі шляхи + історія | значення зрізу: **рядок на показник** — `(зріз, група, метрика)`, тому набір параметрів росте без зміни схеми ([`MONITORING.md`](./MONITORING.md)) |

`npm run check:db` друкує той самий список, що видно в дашборді Cloudflare. Розбіжність означає,
що таблицю створили повз реєстр.

**`scenarios`.** Дві різні речі, і плутати їх не можна: **`id`** — номер рядка (`PRIMARY KEY`), тобто
ідентичність, яка не змінюється ніколи; **`slug`** — адреса (`NOT NULL UNIQUE`), яку редагують вільно.

**Індекси** (`indexes`) живуть поруч із таблицею, щоб не «губились» окремо від неї.
Їх оголошують п'ятнадцять таблиць — `trackers` (`idx_trackers_owner_key`, `idx_trackers_owner_active`, `idx_trackers_public`),
`tracker_entries` (`idx_tracker_entries_tracker_day`, `idx_tracker_entries_owner_day`),
`notes` (`idx_notes_scope_owner` за `(scope, owner_id)`), `contacts`
(`idx_contacts_owner`), `conversations` (`idx_conversations_peer_b`), `messages` (`idx_messages_thread`,
`idx_messages_unread`), `message_media` (`idx_message_media_owner` — квота файлів однієї людини),
`ads` (`idx_ads_owner`, `idx_ads_doska` — дошка за `(is_active, id)`),
`theme_schemes` (`idx_themes_owner`, `idx_themes_public`), `metrics_values`
(`idx_metrics_values_metric` — історія одного показника за часом) і п'ять таблиць магазину:
`shop_products` (`idx_shop_products_shop` — товари за `(shop_id, is_active, id)`), `shop_media`,
`shop_orders` (`idx_shop_orders_shop` і `idx_shop_orders_buyer` — список покупця), `shop_order_items`,
`shop_order_statuses` (кожна — за своїм `shop_id` чи `order_id`). Унікальність `contacts.code`,
`scenarios.slug`, `shop_products (shop_id, slug)`, `shop_media.r2_key` і
`shop_order_statuses (shop_id, key)` тримає `UNIQUE` у самому `CREATE TABLE`, а не іменований індекс:
імена індексів у SQLite **глобальні для бази**, тому однойменний `CREATE UNIQUE INDEX IF NOT EXISTS`
на другій таблиці — не помилка, а **порожня дія**, і таблиця лишилась би без унікальності, не сказавши
про це нікому. Те саме стосується `platform_username` — його унікальність тримає сам запит
(`SELECT … WHERE platform_username = ?` перед записом).

### `contacts`: два входи — дві дати, і жодну не пише власник

Людина може зайти в бота за лінком і **не відкрити платформу**: це **часткове** приєднання, і без
другої дати його не було б видно. Тому замість однієї колонки «приєднався» — три:

| Колонка | Хто пише | Що це |
|---|---|---|
| `joined_user_id` | бот (`ctx.from`) | **хто** прийшов — id людини, не вгаданий власником |
| `joined_bot_at` | бот, при `?start=<код>` | вхід **у бота** (часткове приєднання) |
| `joined_platform_at` | `api-dev`, на першому ж запиті з підписом | вхід **на платформу** (повне приєднання) |
| `username` | бот, при `?start=<код>` | Telegram-юзернейм людини — власник його **не вписує й не бачить до переходу** |

Правити ці колонки не може ніхто, крім того, хто бачив перехід: вписане руками число робило б
контакт «приєднаним», а лінк — «використаним» без жодного переходу. Закріплення — **один раз**:
`WHERE joined_user_id IS NULL` стоїть у самому `UPDATE`, який робить `bot-dev`, тож другий, хто
відкриє той самий лінк, контакту не змінить (але й не зламає закріпленого). Власник за власним
лінком контактом не стає, а `username` бот пише лише тоді, коли його ще немає (`COALESCE`) —
перехід не має права переписати те, що вже стоїть. Тіла запиту **`/api/contacts` не читає
взагалі**: надісланий клієнтом хендл не створив би контакту з чужим ім'ям.

### Дві різні «імена» в `users`

| Колонка | Хто пише | Що це |
|---|---|---|
| `username` | бот (`ctx.from`) | Telegram-юзернейм людини: ми його **не обираємо**, він може бути відсутнім або змінитись |
| `platform_username` | сам користувач (TWA → `/api/user/username`) | ім'я на wwwuabot — головне ім'я в продукті; правила одні на всі поверхні (`packages/shared/src/user/platform-username.ts`), зайняте → **409** |
| `telegram_json` | бот (`ctx.from` як JSON) | усе, що Telegram віддав про людину, **як є** — щоб профіль показував справжні дані, а не перелік, який ми склали самі |

Зрізи моніторингу — [`MONITORING.md`](./MONITORING.md). Легасі-хвіст дев-бази — [`DB_LEGACY.md`](./DB_LEGACY.md).
