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
        is_active INTEGER DEFAULT 1
      )`,
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
      "Розмова двох людей: пара Telegram-id за зростанням та останнє повідомлення для списку розмов.",
    create: `CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        peer_a INTEGER NOT NULL,
        peer_b INTEGER NOT NULL,
        last_message_at TEXT,
        last_message_text TEXT,
        last_sender_id INTEGER,
        greeted_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE (peer_a, peer_b)
      )`,
    indexes: ["CREATE INDEX IF NOT EXISTS idx_conversations_peer_b ON conversations(peer_b)"],
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
} satisfies Record<string, TableDefinition>;

/** Імена всіх оголошених таблиць. */
export type TableName = keyof typeof TABLES;

/** Список оголошених таблиць (для тестів і гейта). */
export const TABLE_NAMES = Object.keys(TABLES) as TableName[];

/** Опис таблиці за іменем або `undefined`, якщо її не оголошено. */
export function tableDefinition(name: string): TableDefinition | undefined {
  return (TABLES as Record<string, TableDefinition>)[name];
}
