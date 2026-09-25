/**
 * Реєстр таблиць D1 — єдина точка правди про схему бази.
 *
 * **Навіщо це з'явилось.** До 13.09.2026 DDL був розсипаний по чотирьох місцях
 * (контролер сценаріїв, фабрика контролерів, `services/sites/schema.ts`,
 * репозиторій налаштувань), а дві таблиці — `users` і `mydate_analysis` — не
 * створював **ніхто**: вони існували лише тому, що їх колись завели руками в
 * дашборді Cloudflare. На чистій базі перший же запис користувача і
 * `/api/mydate/analysis/*` падали б з `no such table`.
 *
 * **Правило.** Таблиця описується тут один раз: ім'я, власник, призначення, DDL.
 * Створювати таблицю повз цей файл заборонено — стереже `npm run check:db`.
 * Колонки не оголошуються окремим списком: вони **виводяться з самого DDL**,
 * бо два списки (DDL і «колонки») неминуче розійдуться — саме так дві копії
 * таблиці сценаріїв колись отримали різні схеми.
 *
 * **Це файл даних.** Тут немає логіки: ані `ensureTables`, ані розбору колонок.
 * Код, який застосовує ці оголошення, живе в
 * `packages/shared/src/database/ensure-tables.ts` — інакше реєстр переростає
 * 400 рядків (помилка `check:quality`) і його неможливо правити впевнено.
 *
 * **Жива база.** `ensureTables()` тільки **додає**: `CREATE TABLE IF NOT EXISTS`
 * і `ALTER TABLE … ADD COLUMN` для тих колонок, яких у наявній таблиці немає.
 * Він нічого не видаляє, не перейменовує і не змінює типів, тому його безпечно
 * викликати на базі з даними. Порядок і типи колонок у наявній таблиці мають
 * значення лише для читання — саме тому другорядні колонки оголошені з `DEFAULT`.
 *
 * **Імена індексів глобальні** для бази, а не для таблиці: однойменний
 * `CREATE UNIQUE INDEX IF NOT EXISTS` на другій таблиці — не помилка, а
 * **порожня дія**, і таблиця лишається без унікальності (так `idx_pages_slug`
 * колись зайняла `site_pages`). Збіги імен стереже `tables.test.ts`.
 *
 * @module @wwwuabot/shared/database/tables
 */

/** Хто господар таблиці: воркер, який її створює й відповідає за її дані. */
export type TableOwner = "bot-dev" | "api-dev";

export interface TableDefinition {
  /** Ім'я таблиці в D1 — те саме, що стоїть у SQL (у лапках, якщо треба). */
  readonly name: string;
  /** Воркер-власник: він і тільки він створює таблицю. */
  readonly owner: TableOwner;
  /** Одним рядком: для чого таблиця. Те саме — у `docs/DATA_MODEL.md`. */
  readonly purpose: string;
  /** `CREATE TABLE IF NOT EXISTS …` — повне оголошення. Іншого DDL не буває. */
  readonly create: string;
  /** Індекси таблиці; створюються після неї, також ідемпотентно. */
  readonly indexes?: readonly string[];
}

/**
 * Усі таблиці D1. Ключ — ім'я таблиці, і воно ж мусить стояти в `create`:
 * розбіжність ловить `check:db` (і `tables.test.ts`).
 */
export const TABLES = {
  // ── bot-dev ────────────────────────────────────────────────────────────

  /**
   * Стан користувача Telegram. Господар — `bot-dev` (він пише першим),
   * читають обидві оболонки через `api-dev`.
   *
   * **Дві різні «імена» — навмисно, і це не дубль.** `username` — те, що Telegram
   * віддав у `initData` (`@handle` людини в Telegram, ми його не обираємо);
   * `platform_username` — те, що людина обрала **на нашій платформі**, і саме воно
   * є її іменем у продукті (профіль, майбутні підписи, пошук). Друге — не копія
   * першого: у Telegram handle може бути відсутнім або змінитись, а ім'я в нас — ні.
   *
   * `telegram_json` — усе, що Telegram віддав про користувача (`ctx.from` як є),
   * щоб профіль показував **справжні** дані, а не перелічені нами поля. Пише його
   * `bot-dev` під час звернення до бота; `api-dev` цю колонку не заповнює.
   *
   * **Публічність — три колонки, а не друга таблиця.** `photo_url` — фото, яке
   * людина ставить собі **на платформі** (не аватар Telegram); `about` — «Про
   * себе»; `profile_public` — прапорець «показувати мене в Просторі»;
   * `profile_public_fields` — JSON-масив відкритих полів. Це все ознаки **тієї
   * самої** людини, тож живуть у її рядку: окрема таблиця `profiles` завела б
   * другий рядок на людину й друге правило «які дані публічні» (AGENTS.md §7).
   * Правила набору й фільтр видимості — `@wwwuabot/shared/user/public-profile`.
   */
  users: {
    name: "users",
    owner: "bot-dev",
    purpose:
      "Стан користувача Telegram: профіль, роль, тариф, блокування, ім'я на платформі, збережені дати.",
    create: `CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY,
        first_name TEXT,
        last_name TEXT,
        username TEXT,
        language TEXT,
        role TEXT DEFAULT 'user',
        tariff TEXT DEFAULT 'free',
        status TEXT DEFAULT 'active',
        discount INTEGER DEFAULT 0,
        permissions TEXT DEFAULT '[]',
        is_blocked INTEGER DEFAULT 0,
        rate_limit_json TEXT,
        active_scenario TEXT,
        message_id INTEGER,
        my_dates TEXT,
        telegram_json TEXT,
        platform_username TEXT,
        photo_url TEXT,
        about TEXT,
        profile_public INTEGER DEFAULT 0,
        profile_public_fields TEXT,
        created_at TEXT,
        updated_at TEXT
      )`,
  },

  settings: {
    name: "settings",
    owner: "bot-dev",
    purpose: "Один рядок (id = 1) налаштувань бота: chat_id груп, прапорець активності.",
    create: `CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY DEFAULT 1,
        bot_active INTEGER DEFAULT 1,
        group_admin TEXT DEFAULT ''
      )`,
  },

  // ── api-dev ────────────────────────────────────────────────────────────

  /**
   * **Єдине місце, де живе контент.** Рядок = сторінка вебу (`page_data`, який
   * рендерить `PageRenderer`) **разом із поданням у боті** (`caption_*`,
   * `buttons`, `rich_message`): саме так це описав власник — «два інтерфейси,
   * бот і веб; кожен рядок — одна сторінка + бот».
   *
   * Три сусідні сховища того самого — `sites` + `site_pages` (друга реалізація
   * для вебу) і `scenarios-admin` (тестова копія без читача) — видалено
   * 13.09.2026 разом із таблицями, маршрутами й сторінками: вони **дублювали**
   * цю таблицю, а не доповнювали її.
   *
   * Таблиця `pages`, яку було додано в реєстр як «цільову», видалена того ж
   * дня: на дев-базі вона не існувала, нічого не читала й нічого не
   * зберігала — тобто була п'ятим сховищем замість одного. Деталі —
   * `docs/CONTENT_MODEL.md`.
   *
   * **Адреса.** Адреса рядка одна — `slug`; саме її використовують веб-шлях і
   * payload діплінка. Подання адреси (`/mydate/…` і `?start=mydate_…`) будує
   * `@wwwuabot/shared/content`.
   *
   * **Номер рядка — `id`.** Адреса жива: її редагують, і сторінка від цього не
   * мусить ставати іншою. Тому ідентичність — номер (`INTEGER PRIMARY KEY
   * AUTOINCREMENT`), а `slug` лишається **адресою** з `UNIQUE`: саме на неї
   * спирається `ON CONFLICT(slug)` в адмінському UPSERT.
   *
   * **Чому `UNIQUE` у DDL, а не окремим індексом.** Імена індексів у SQLite
   * глобальні для бази (див. вище): іменований `idx_scenarios_slug` міг би
   * виявитись зайнятим індексом **іншої** таблиці, і тоді `CREATE UNIQUE INDEX
   * IF NOT EXISTS` не створив би нічого, а таблиця лишилася б без
   * унікальності — без помилки. Обмеження в `CREATE TABLE` цієї пастки не має.
   *
   * **14.09.2026 на дев-базі:** таблицю перебудовано (номер + `UNIQUE`-адреса),
   * легасі-колонки `codeword`/`web_slug` прибрано, стару таблицю лишено як
   * `scenarios_legacy_20260914` — скрипт і звіт у `scripts/migrations/`.
   *
   * **Три колонки для сторінок, які створює людина** (22.09.2026) — і жодної
   * нової таблиці: `owner_id` (Telegram-id автора з підписаного `initData`;
   * `NULL` — контент платформи), `is_public` (видимість назовні, типово `0`) і
   * `template_key` (з якого шаблону зроблено сторінку — щоб форма відкрила
   * ті самі поля). Ознака контенту — колонка тут, а не таблиця поруч
   * (`AGENTS.md` §7).
   *
   * **`COALESCE(is_public, 0)` — не перестраховка.** Колонка додана наявній
   * таблиці, а `ensureTables` додає її як `DEFAULT NULL` (`ensure-tables.ts`),
   * тож у рядках платформи там `NULL`, і просте `is_public = 1` мовчки
   * відкинуло б усе.
   */
  scenarios: {
    name: "scenarios",
    owner: "api-dev",
    purpose:
      "Єдине сховище контенту: рядок = сторінка вебу (`page_data`) + її подання в боті. Читає bot-dev, редагує адмінка (/api/portal/scenarios/*).",
    create: `CREATE TABLE IF NOT EXISTS "scenarios" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        slug TEXT NOT NULL UNIQUE,
        photo_url TEXT,
        caption_top TEXT,
        caption_mid TEXT,
        caption_bot TEXT,
        keyboard_type TEXT NOT NULL DEFAULT 'static',
        buttons TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        price TEXT,
        qty_options TEXT,
        awaits_input TEXT,
        input_path TEXT,
        input_next TEXT,
        title TEXT,
        notify_groups TEXT,
        notify_template TEXT,
        rich_message TEXT,
        rich_data TEXT,
        page_data TEXT DEFAULT NULL,
        is_active INTEGER DEFAULT 1,
        owner_id TEXT,
        is_public INTEGER DEFAULT 0,
        template_key TEXT
      )`,
    indexes: ["CREATE INDEX IF NOT EXISTS idx_scenarios_owner ON scenarios(owner_id)"],
  },

  /**
   * Нотатки — чернетки, а не контент: `text` і `tags` людини в платформі
   * (`scope = 'user'`) та нотатки про проєкт з адмінки (`scope = 'admin'`).
   *
   * **Чому не `scenarios`.** Там `slug` — `NOT NULL UNIQUE`, тобто рядка без
   * адреси не існує, і це *опублікований* контент (видимість — `is_active`).
   * Нотатку не бачить ніхто, крім власника; поклавши її туди, ми мали б у
   * одній таблиці другий фільтр видимості («моє» проти «опублікованого») — та
   * сама паста, що колись дала дві копії сценаріїв (AGENTS.md §7).
   *
   * **Власник — дві колонки, а не одна з префіксом.** `scope` каже, чия
   * ідентичність має значення, `owner_id` — хто саме: Telegram-id із
   * **підписаного `initData`** (жодних заголовків, AGENTS.md §7) або акаунт
   * cookie-сесії панелі. Тому `owner_id` — `TEXT`: id людини і акаунт сесії
   * мають різну природу, і зводити їх до числа не можна.
   *
   * `tags` — JSON-масив, як `buttons` чи `page_data`: правила, за якими він
   * складається, живуть у `@wwwuabot/shared/notes` і однакові для браузера й
   * сервера. Колонки `attachments` тут поки немає навмисно — додавання фото й
   * відео окрема тема; `ensureTables` додасть її одним рядком у цьому
   * оголошенні, без міграції й без правок у логіці.
   */
  notes: {
    name: "notes",
    owner: "api-dev",
    purpose:
      "Нотатки: чернетки людини в платформі (`scope = 'user'`) і нотатки про проєкт з адмінки (`scope = 'admin'`).",
    create: `CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scope TEXT NOT NULL DEFAULT 'user',
        owner_id TEXT NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        tags TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    indexes: ["CREATE INDEX IF NOT EXISTS idx_notes_scope_owner ON notes(scope, owner_id)"],
  },

  /**
   * Оголошення — дошка Простору: куплю, продам, здам, шукаю, обміняю,
   * подарую, надаю послуги. Пишуть **усі**, читають у стрічці.
   *
   * **Чому не `scenarios`.** Там `slug` — `NOT NULL UNIQUE`: це *опублікований
   * контент із адресою*, сторінка, яку відкривають за посиланням. Оголошення
   * адреси не має й не матиме — його читають у стрічці, і правила в нього свої
   * (вид, ціна, місто, зняти з дошки). Поклавши його в `scenarios`, ми мали б
   * вигадувати `slug` кожному рядку й тримати в тій самій таблиці другий
   * фільтр видимості — та сама пастка, що колись дала дві копії сценаріїв
   * (AGENTS.md §7).
   *
   * **`is_active` тут — не те саме, що в `scenarios`.** Це «показати на дошці»:
   * вимкнене оголошення лишається в списку власника (чернетка), але на дошці
   * його немає. Видаляти його для цього не потрібно.
   *
   * `price` — **текст**, і це не недогляд: «договірна» й «за домовленістю» —
   * теж ціна, а число змусило б людину вигадувати нуль. Правила виду, меж і
   * перевірки — `@wwwuabot/shared/ads`.
   */
  /**
   * Замовлення магазину — **рядок, а не повідомлення**.
   *
   * Замовлення не живе ні в рядку користувача, ні в тексті листування: `users`
   * пише бот під час звернення, і структурованого замовлення там немає, а
   * переписка — це текст, у якому факт замовлення не існує як дані
   * (`docs/SHOPS.md` §6 і §8).
   *
   * **`status` — ключ, а не підпис.** Підпис людина переписує під свій процес
   * скільки завгодно, і якби в замовленні лежав він, перейменування статусу
   * переписувало б історію. Типові ключі — у коді (`DEFAULT_ORDER_STATUSES`),
   * а магазин тримає лише відхилення (`shop_order_statuses`).
   *
   * **`contact` — JSON**, і це не «гнучкість»: склад полів залежить від виду
   * товару (фізичному потрібна адреса, цифровому — канал), тож колонки під
   * кожне поле змусили б `ALTER TABLE` на кожен новий вид. Пише його сервер і
   * лише за переліком `orderContactFields` — зайвих ключів у JSON не буває.
   */
  shop_orders: {
    name: "shop_orders",
    owner: "api-dev",
    purpose:
      "Замовлення магазину: покупець, ключ статусу, контакт покупця JSON-ом і нотатка. Позиції — знімком у `shop_order_items`.",
    create: `CREATE TABLE IF NOT EXISTS shop_orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_id INTEGER NOT NULL,
        buyer_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        contact TEXT NOT NULL DEFAULT '{}',
        note TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_shop_orders_shop ON shop_orders(shop_id, id)",
      "CREATE INDEX IF NOT EXISTS idx_shop_orders_buyer ON shop_orders(buyer_id, id)",
    ],
  },

  /**
   * Позиція замовлення — **знімок, а не посилання**.
   *
   * Назва, ціна й вид **копіюються** на момент замовлення, і це суть таблиці:
   * правка ціни заднім числом переписувала б історію, а видалений товар зникав
   * би із замовлення, яке вже прийняли. `product_id` лишається поруч — щоб
   * знайти, про що було, коли товар ще є; зникати він при цьому не мусить, тож
   * `NOT NULL` тут немає (видалення товару позицію не чіпає).
   *
   * `kind` — **текстом**, а не ключем із кодом: перелік видів може змінитися, а
   * історія замовлення мусить читатись як є.
   */
  shop_order_items: {
    name: "shop_order_items",
    owner: "api-dev",
    purpose:
      "Знімок позиції замовлення: назва, ціна й вид на момент замовлення + `product_id` як посилання.",
    create: `CREATE TABLE IF NOT EXISTS shop_order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        product_id INTEGER,
        title TEXT NOT NULL DEFAULT '',
        price TEXT NOT NULL DEFAULT '',
        kind TEXT NOT NULL DEFAULT '',
        qty INTEGER NOT NULL DEFAULT 1
      )`,
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_shop_order_items_order ON shop_order_items(order_id, id)",
    ],
  },

  /**
   * Статуси замовлення магазину — **лише відхилення від типових**.
   *
   * Типові народжуються з `DEFAULT_ORDER_STATUSES` у коді, а сюди потрапляє
   * тільки те, чим магазин відрізняється: перейменування (той самий ключ, свій
   * підпис), вимкнення (`is_active = 0`) і власні статуси. Без цього правила
   * кожен новий магазин починався б із копії тих самих п'яти рядків, а зміна
   * типового набору в коді не доїхала б до жодного з них.
   *
   * **Статус не видаляють — його вимикають:** підпис потрібен і для старих
   * замовлень, тож рядок лишається, а для нових статус не пропонується.
   *
   * Порожній `label` означає «лишається типовий підпис»; розрізняє це
   * `resolveOrderStatuses`, а не схема.
   */
  shop_order_statuses: {
    name: "shop_order_statuses",
    owner: "api-dev",
    purpose:
      "Відхилення статусів замовлення магазину: перейменування типового, вимкнення й власні статуси. Ключ — контракт, підпис — слово магазину.",
    create: `CREATE TABLE IF NOT EXISTS shop_order_statuses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_id INTEGER NOT NULL,
        key TEXT NOT NULL,
        label TEXT NOT NULL DEFAULT '',
        stage TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (shop_id, key)
      )`,
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_shop_order_statuses_shop ON shop_order_statuses(shop_id, id)",
    ],
  },

  ads: {
    name: "ads",
    owner: "api-dev",
    purpose:
      "Оголошення дошки Простору: вид (куплю/продам/здам/шукаю/…), заголовок, текст, ціна й місто; `is_active` — показати на дошці чи лишити чернеткою.",
    create: `CREATE TABLE IF NOT EXISTS ads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL,
        kind TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        price TEXT NOT NULL DEFAULT '',
        place TEXT NOT NULL DEFAULT '',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_ads_owner ON ads(owner_id)",
      "CREATE INDEX IF NOT EXISTS idx_ads_doska ON ads(is_active, id)",
    ],
  },

  /**
   * Схеми теми — бібліотека **іменованих** наборів вигляду, які створила
   * людина: три кольори, шрифт і публічність.
   *
   * **Чому окрема таблиця, а не колонка в `users`.** По-перше, схем багато на
   * одного (своя бібліотека, а не один поточний вибір). По-друге, схема буває
   * **публічною** — її бачать інші люди в Просторі, а це вже не дані власника:
   * це опублікований контент із власним правилом видимості. Колонка-JSON у
   * `users` зробила б публічне подання вибіркою з чужого рядка й поклала б
   * фільтр видимості в розмітку (AGENTS.md §7).
   *
   * **Поточний вибір тут не живе.** Що зараз на екрані, знає пам'ять пристрою
   * (`localStorage`, ключі `wwwuabot-colors` / `wwwuabot-font`): інакше вигляд
   * застосунку чекав би на мережу, а палітра мигала б брендовою на кожному
   * запуску. Тут — **бібліотека**, у пам'яті — **стан**.
   *
   * **`text_color`, а не `text`:** слово `text` у SQL читається як частина
   * виразу, і колонка виглядала б як друкарська помилка.
   *
   * `font` — **ідентифікатор** зі спільного набору (`styles/fonts.ts`),
   * порожній — «як у стилі». Стек тут не лежить навмисно: змінилася б родина в
   * коді — старі схеми тягли б за собою мертвий стек.
   */
  theme_schemes: {
    name: "theme_schemes",
    owner: "api-dev",
    purpose:
      "Іменовані схеми теми (три кольори + шрифт), створені людиною; `is_public = 1` виносить схему в спільну бібліотеку Простору.",
    create: `CREATE TABLE IF NOT EXISTS theme_schemes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        bg TEXT NOT NULL,
        text_color TEXT NOT NULL,
        accent TEXT NOT NULL,
        font TEXT NOT NULL DEFAULT '',
        is_public INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_themes_owner ON theme_schemes(owner_id)",
      "CREATE INDEX IF NOT EXISTS idx_themes_public ON theme_schemes(is_public, id)",
    ],
  },

  /**
   * Контакти людини — її власний довідник, а не список лінків.
   *
   * **Один рядок = один контакт.** Запис заводять руками (ім'я, `@username`,
   * Telegram-id, хештеги, примітки), і **лінк — одне з його полів**
   * (`code`), а не окрема сутність: контакт може жити без лінка, і це
   * нормальний стан, а не «незавершене створення». Тому таблиці поруч
   * (наприклад `invites`) немає: вона була б другим сховищем того самого
   * контакту (AGENTS.md §7).
   *
   * `code` — те, що їде в `?start=` (`inv-8f3k2q`), тож воно `UNIQUE` (інакше
   * два лінки вели б до одного контакту) і мусить проходити
   * `isValidBotPayload` — правила коду живуть у `@wwwuabot/shared/contacts`, а
   * не тут: у `UNIQUE` про формат payload не сказано нічого. `NULL` у `code`
   * дозволений і повторюваний (SQLite не вважає два `NULL` однаковими), бо
   * контактів без лінка може бути скільки завгодно.
   *
   * **Закріплення — один раз і назавжди.** `joined_user_id` пише `bot-dev`
   * лише коли колонка порожня (`WHERE joined_bot_at IS NULL`): лінк
   * персональний, і другий, хто за ним прийде, контакту вже не змінить.
   *
   * **Два входи — дві дати, і жодну з них не пише власник.** `joined_bot_at`
   * ставить бот, коли людина відкрила `?start=<код>`; `joined_platform_at` —
   * `api-dev`, коли та сама людина (за своїм Telegram-id) зайшла на
   * платформу. Це не дублювання: людина може зайти в бота й не відкрити
   * платформу, і тоді приєднання **часткове** — стан, який ніде більше не
   * видно. Id людини при цьому один (`joined_user_id`): його дає `ctx.from`
   * бота, а не власник — вгадане число робило б контакт приєднаним, а лінк
   * використаним без жодного переходу.
   *
   * **Господар — `api-dev`:** контакти створює й показує платформа. `bot-dev`
   * лише закріплює факт приєднання, коли людина приходить із діплінка, — і теж
   * кличе `ensureTables`, бо пише **першим**: людина відкриває бота раніше, ніж
   * платформа встигає створити таблицю.
   */
  contacts: {
    name: "contacts",
    owner: "api-dev",
    purpose:
      "Контакти людини: ім'я, `@username`, хештеги, примітки й особистий лінк-запрошення (`code`) як поле. Створює й показує платформа; `bot-dev` пише вхід у бота (`joined_user_id`, `joined_bot_at`), `api-dev` — вхід на платформу (`joined_platform_at`).",
    create: `CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        username TEXT,
        telegram_user_id INTEGER,
        tags TEXT NOT NULL DEFAULT '[]',
        notes TEXT NOT NULL DEFAULT '',
        code TEXT UNIQUE,
        joined_user_id INTEGER,
        joined_bot_at TEXT,
        joined_platform_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    indexes: ["CREATE INDEX IF NOT EXISTS idx_contacts_owner ON contacts(owner_id)"],
  },

  /**
   * Розмова **двох** людей платформи.
   *
   * **Один рядок на пару, а не на напрямок.** `peer_a` і `peer_b` — це та
   * сама пара, впорядкована за зростанням id (`conversationPair` зі
   * `@wwwuabot/shared/messages`), тож `UNIQUE (peer_a, peer_b)` справді
   * означає «одна розмова на двох». Без порядку та сама переписка мала б
   * **два** рядки — по одному на кожного, хто написав першим, і кожен бачив би
   * половину повідомлень.
   *
   * `last_message_at` / `last_message_text` тут навмисно: список розмов
   * показує останній рядок кожної, і без цих колонок він читав би **всі**
   * повідомлення людини, щоб показати по одному з розмови.
   *
   * **Прибрана розмова ховається, а не зникає.** `hidden_a` / `hidden_b`
   * кажуть, кому з двох розмова не показується (індекси ті самі, що в `peer_a`
   * / `peer_b` — пара ж упорядкована), і ставляться **разом**: переписка
   * спільна, тож лишити її одному означало б дати двом різний результат тієї
   * самої дії. Рядка не можна видаляти: без нього не лишається ні шляху
   * написати, ні входу в розмову — і пара замовкла б назавжди. Тому прапорці
   * знімає наступне повідомлення (`sendMessage`), і розмова вертається обом.
   *
   * `greeted_at` — дата **одноразового** вітання пари (людину запросили за
   * лінком, і вона відкрила чат). Це не «лічильник повідомлень» і не копія
   * `messages`: ознака стоїть на парі, а не на рядку переписки, і саме вона
   * робить вітання одноразовим — заявку на нього виграє один `UPDATE`
   * (`WHERE greeted_at IS NULL`), тому двоє одночасних відкриттів не дають
   * двох привітань.
   *
   * `UNIQUE` — у `CREATE TABLE`, а не окремим індексом: імена індексів у
   * SQLite глобальні для бази, і однойменний `CREATE UNIQUE INDEX IF NOT
   * EXISTS` на другій таблиці був би **порожньою дією** без помилки (див.
   * шапку файлу).
   *
   * **Хто з ким може листуватись — не тут.** Правило «зв'язані через контакти»
   * читає таблицю `contacts` і живе в `api-dev/src/services/messages/links.ts`:
   * у схемі про контакти не сказано нічого, а дублювати правило в SQL означало б
   * мати дві правди про те, кому можна писати.
   */
  conversations: {
    name: "conversations",
    owner: "api-dev",
    purpose:
      "Розмова двох людей: пара Telegram-id за зростанням, останнє повідомлення для списку розмов і приховування на стороні кожного (`hidden_a` / `hidden_b`).",
    create: `CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        peer_a INTEGER NOT NULL,
        peer_b INTEGER NOT NULL,
        last_message_at TEXT,
        last_message_text TEXT,
        last_sender_id INTEGER,
        greeted_at TEXT,
        hidden_a INTEGER NOT NULL DEFAULT 0,
        hidden_b INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (peer_a, peer_b)
      )`,
    indexes: ["CREATE INDEX IF NOT EXISTS idx_conversations_peer_b ON conversations(peer_b)"],
  },

  /**
   * Чернетка нового повідомлення — **власні дані того, хто пише**.
   *
   * Існує до першого повідомлення, тож ключ тут — пара людей (`owner_id`,
   * `peer_id`), а не розмова: розмови на цей момент може ще не бути взагалі.
   * Співрозмовник про чернетку не знає, і тому вона не в `messages`: у тей
   * таблиці лежить **спільне**, а чернетка належить одному (як нотатка чи
   * контакт — з тією ж різницею, що адресат у неї є).
   *
   * `UNIQUE (owner_id, peer_id)` — це не прикраса: чернетка на пару рівно
   * одна, а `ON CONFLICT … DO UPDATE` без неï дав би їх скільки завгодно, і
   * «остання» визначалася б випадковим порядком рядків.
   *
   * Порожне тіло — законний стан («обрав людину, а не написав»), але тоді
   * рядка немає: його прибирає `saveDraft`, бо чернетка без тіла нічого не несе.
   */
  message_drafts: {
    name: "message_drafts",
    owner: "api-dev",
    purpose:
      "Ненадісланий текст листа: документ зі своїм номером і необов'язковим адресатом, окремо від переписки (співрозмовник її не бачить).",
    // Пари «власник + адресат» тут немає навмисно: чернеток людині може бути
    // кілька, у тому числі одній і тій самій, а `UNIQUE (owner_id, peer_id)`
    // робив із них один слот — друга збережена чернетка тихо переписувала першу.
    // `peer_id` без `NOT NULL` — те саме: лист буває й без адресата.
    // Наявній у дев-базі таблиці ні те, ні те `ensureTables` дати не може (він
    // лише додає колонки), тож перебудував окремий SQL —
    // `scripts/migrations/2026-09-19-message-drafts-*.sql`.
    create: `CREATE TABLE IF NOT EXISTS message_drafts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        owner_id INTEGER NOT NULL,
        peer_id INTEGER,
        body TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    indexes: ["CREATE INDEX IF NOT EXISTS idx_drafts_owner ON message_drafts(owner_id)"],
  },

  /**
   * Повідомлення розмови — тіло, автор і **коли прочитано**.
   *
   * Прочитання позначене датою в тому ж рядку (`read_at`), а не окремою
   * таблицею чи стовпчиком-лічильником у розмові: непрочитані — це запит
   * `sender_id <> ? AND read_at IS NULL`, і він працює по індексу. Друге
   * сховище того самого факту неминуче розійшлося б із першим (AGENTS.md §7).
   *
   * `body` зберігається **як є** (обрізане й притиснуте по краях
   * `sanitizeMessageBody`), без розбору розмітки: у платформі тіло — це текст,
   * а не HTML-фрагмент, і будь-яке «форматування» тут означало б другу мову
   * розмітки поруч із `page_data`.
   *
   * `is_system` — позначка платформи, а не людини (`SYSTEM_SENDER_ID` у
   * `sender_id`): таких рядків у переписці рівно два, і обидва — вітання пари
   * (`greeting.ts`). Окрема колонка, а не «нуль у `sender_id` на здогад»:
   * сторона бульбашки береться з `sender_id`, тож магічне число без прапорця
   * виглядало б як ще один учасник переписки. `read_at` таким рядкам ставиться
   * одразу — вони не «непрочитані», бо їх ніхто не писав.
   */
  messages: {
    name: "messages",
    owner: "api-dev",
    purpose:
      "Повідомлення розмови: автор, тіло й дата прочитання (непрочитані — `read_at IS NULL`).",
    create: `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        read_at TEXT,
        is_system INTEGER NOT NULL DEFAULT 0
      )`,
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(conversation_id, id)",
      "CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(conversation_id, read_at)",
    ],
  },

  /**
   * Товар магазину — **окремий рядок, а не сторінка**.
   *
   * Рядок `scenarios` — це сторінка: `page_data` плюс подання в боті
   * (`caption_*`, `buttons`, `rich_*`). Каталог на триста позицій роздув би
   * таблицю, у якій кожен рядок несе бота, і зробив би «сторінки» й «товари»
   * нерозрізнюваними. Товар не має ані подання в боті, ані власного хвоста
   * параметрів: адресу йому дає магазин (`docs/SHOPS.md` §2–3).
   *
   * **`shop_id` — номер рядка `scenarios`**, а не окремої таблиці магазинів:
   * магазин і є сторінка, тож другої ідентичності в нього немає.
   * `UNIQUE (shop_id, slug)` — у `CREATE TABLE`, а не індексом: імена індексів
   * у SQLite глобальні для бази, і однойменний `CREATE UNIQUE INDEX IF NOT
   * EXISTS` на другій таблиці був би **порожньою дією** (див. шапку файлу).
   *
   * **Ціна — текст**, як в оголошеннях: «договірна» теж ціна. **`images` —
   * номери файлів `shop_media`**, а не адреси: адресу будує читання з ключа R2,
   * і вона змінилася б разом із бакетом.
   *
   * **`category` — розділ каталогу назвою.** Окремої таблиці розділів немає
   * навмисно: у розділу немає нічого, крім назви, а перелік розділів магазину
   * складається з його товарів (`shopCatalogs`). Порожній розділ читається як
   * «Інші товари», тож порожнього місця в каталозі не буває ніколи.
   */
  shop_products: {
    name: "shop_products",
    owner: "api-dev",
    purpose:
      "Товар магазину: адреса унікальна в межах магазину (`UNIQUE (shop_id, slug)`), вид — ключ із коду, ціна — текст, фото — номери `shop_media`.",
    create: `CREATE TABLE IF NOT EXISTS shop_products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_id INTEGER NOT NULL,
        slug TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'physical',
        title TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT '',
        summary TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        price TEXT NOT NULL DEFAULT '',
        images TEXT NOT NULL DEFAULT '[]',
        attributes TEXT NOT NULL DEFAULT '[]',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (shop_id, slug)
      )`,
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_shop_products_shop ON shop_products(shop_id, is_active, id)",
    ],
  },

  /**
   * Облік файлів R2 — **рядок на файл, а не поле товару**.
   *
   * Порядок дій розв'язує питання «одне фото в товарі чи бібліотека»: файл
   * спершу **завантажують**, потім **приєднують**. Між цими кроками він уже
   * існує, і якщо ніде не записаний — його нічим не прибрати, не порахувати й
   * не перевикористати. Тому товар посилається на **номери** цих рядків, а
   * байти лежать у R2.
   *
   * `r2_key` — `shop/<shop_id>/<випадкове>-<ім'я>`: магазин у ключі навмисно, бо
   * за ним рахують квоту й прибирають файли магазину цілком. `UNIQUE (r2_key)`
   * забороняє **два облікові рядки на один файл** — інакше видалення одного з
   * них лишало б другий із мертвим ключем.
   */
  shop_media: {
    name: "shop_media",
    owner: "api-dev",
    purpose:
      "Облік файлів магазину в R2: ключ у бакеті, тип і розмір. Товар посилається на номери цих рядків, а не на байти.",
    create: `CREATE TABLE IF NOT EXISTS shop_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shop_id INTEGER NOT NULL,
        r2_key TEXT NOT NULL UNIQUE,
        mime TEXT NOT NULL DEFAULT '',
        bytes INTEGER NOT NULL DEFAULT 0,
        kind TEXT NOT NULL DEFAULT 'image',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    indexes: ["CREATE INDEX IF NOT EXISTS idx_shop_media_shop ON shop_media(shop_id, id)"],
  },

  mydate_analysis: {
    name: "mydate_analysis",
    owner: "api-dev",
    purpose: "Кеш астрологічного аналізу на дату (KV — швидкий шар, ця таблиця — довгий).",
    create: `CREATE TABLE IF NOT EXISTS mydate_analysis (
        date TEXT PRIMARY KEY,
        systems_data TEXT,
        updated_at TEXT
      )`,
  },

  /**
   * Зріз моніторингу: **коли** зібрано, **чим** і **з яким результатом**.
   *
   * Числа тут не живуть — вони в `metrics_values`, і це головне рішення
   * цієї схеми. Зріз мусить фіксувати **набір** показників, який з часом
   * росте (спершу код і GitHub, далі D1, KV, R2, воркери): колонки під
   * кожен показник означали б `ALTER TABLE` на кожен новий параметр і
   * втрату історії (у новій колонці старих зрізів немає). Рядок на
   * значення росте в довжину, але не ламає форму — усі зрізи читаються
   * однаково (AGENTS.md §7: нова ознака = рядок у реєстрі, не друга таблиця).
   *
   * `collectors` — JSON звіту колекторів (`[{ id, status, durationMs }]`):
   * він пояснює, чому зріз `partial`, і лишається при ньому назавжди. Це не
   * дубль логів, а частина зрізу: логи живуть 3 дні, а питання «чому тут
   * нулі» виникає через місяць.
   *
   * `git_ref` — коміт, на якому зібрано зріз. Без нього динаміка «код виріс
   * на 8 000 рядків» не відповідає на єдине цікаве питання — **на якому саме**
   * коміті.
   */
  metrics_snapshots: {
    name: "metrics_snapshots",
    owner: "api-dev",
    purpose:
      "Зріз показників проєкту: момент збору, ручний він чи за розкладом, стан, коміт і звіт колекторів.",
    create: `CREATE TABLE IF NOT EXISTS metrics_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        collected_at TEXT NOT NULL,
        trigger_kind TEXT NOT NULL DEFAULT 'manual',
        status TEXT NOT NULL DEFAULT 'ok',
        git_ref TEXT,
        collectors TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
  },

  /**
   * Значення зрізу: **один рядок = один показник у одній групі**.
   *
   * Ключ `(snapshot_id, group_key, metric)` — це і є вся ідентичність
   * виміру: зріз без групи (воркспейса) не має сенсу, а два значення одного
   * показника в одному зрізі — це помилка збору, а не дані. `PRIMARY KEY`
   * ловить її вставкою, а не «останній переміг» при читанні.
   *
   * `value REAL` — навмисно не `INTEGER`: динаміка буває дробовою (частки,
   * середні), і окрема таблиця під відсотки була б другою правдою про
   * виміри. `group_key` (`total`, `api-dev`, `packages`, …) — саме група, а
   * не «власник»: показники знімаються з проєкту, а не з людини, і власника
   * тут не існує.
   */
  metrics_values: {
    name: "metrics_values",
    owner: "api-dev",
    purpose:
      "Значення показників зрізу: ключ `(зріз, група, метрика)` — набір параметрів росте без зміни схеми.",
    create: `CREATE TABLE IF NOT EXISTS metrics_values (
        snapshot_id INTEGER NOT NULL,
        group_key TEXT NOT NULL DEFAULT 'total',
        metric TEXT NOT NULL,
        value REAL NOT NULL,
        PRIMARY KEY (snapshot_id, group_key, metric)
      )`,
    indexes: [
      "CREATE INDEX IF NOT EXISTS idx_metrics_values_metric ON metrics_values(metric, group_key)",
    ],
  },
} satisfies Record<string, TableDefinition>;

/** Імена всіх оголошених таблиць. */
export type TableName = keyof typeof TABLES;

/** Список оголошених таблиць (для тестів і гейта). */
export const TABLE_NAMES = Object.keys(TABLES) as TableName[];

/** Опис таблиці за іменем або `undefined`, якщо її не оголошено. */
export function tableDefinition(name: string): TableDefinition | undefined {
  return (TABLES as Record<string, TableDefinition>)[name];
}
