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

  users: {
    name: "users",
    owner: "bot-dev",
    purpose: "Стан користувача Telegram: профіль, роль, тариф, блокування, збережені дати.",
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
   * Таблиця `pages`, яку 13.09.2026 додали в реєстр як «цільову», того ж дня
   * видалена: на дев-базі вона не існувала, нічого не читала й нічого не
   * зберігала — тобто була п'ятим сховищем замість одного. Журнал —
   * `docs/log/journal-2026-09-13-drop-pages-table.md`.
   *
   * **Адреса.** Ідентичність рядка в моделі одна — `slug`. У цій таблиці її
   * подають дві легасі-колонки: `web_slug` (адреса вебу) і `codeword` (ключ
   * діплінка, він же `PRIMARY KEY`). Зводить їх до одного `slug` адаптер
   * `@wwwuabot/shared/content`, а подання адреси (`/mydate/…` і
   * `?start=mydate_…`) будує `resolve.ts`.
   */
  scenarios: {
    name: "scenarios",
    owner: "api-dev",
    purpose:
      "Єдине сховище контенту: рядок = сторінка вебу (`page_data`) + її подання в боті. Читає bot-dev, редагує адмінка (/api/portal/scenarios/*).",
    create: `CREATE TABLE IF NOT EXISTS "scenarios" (
        codeword TEXT PRIMARY KEY,
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
        web_slug TEXT DEFAULT NULL,
        is_active INTEGER DEFAULT 1
      )`,
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
