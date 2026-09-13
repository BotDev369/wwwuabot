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
 * бо два списки (DDL і «колонки») неминуче розійдуться — саме так
 * `scenarios` і `scenarios-admin` отримали різні схеми.
 *
 * **Жива база.** `ensureTables()` тільки **додає**: `CREATE TABLE IF NOT EXISTS`
 * і `ALTER TABLE … ADD COLUMN` для тих колонок, яких у наявній таблиці немає.
 * Він нічого не видаляє, не перейменовує і не змінює типів, тому його безпечно
 * викликати на базі з даними. Порядок і типи колонок у наявній таблиці мають
 * значення лише для читання — саме тому другорядні колонки оголошені з `DEFAULT`.
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

  scenarios: {
    name: "scenarios",
    owner: "api-dev",
    purpose: "Контент бота й порталу; читає bot-dev, редагує адмінка (/api/portal/scenarios/*).",
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

  "scenarios-admin": {
    name: "scenarios-admin",
    owner: "api-dev",
    purpose: "Той самий сценарій, але окремий контент-набір адмінки (/api/admin/scenarios/*).",
    create: `CREATE TABLE IF NOT EXISTS "scenarios-admin" (
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

  sites: {
    name: "sites",
    owner: "api-dev",
    purpose: "Сайт користувача: slug, статус модерації, публічність, шаблон.",
    create: `CREATE TABLE IF NOT EXISTS sites (
        id TEXT PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        owner_id INTEGER NOT NULL,
        status TEXT DEFAULT 'draft',
        template_id TEXT,
        settings TEXT DEFAULT '{}',
        is_public INTEGER DEFAULT 0,
        thumbnail TEXT,
        reject_reason TEXT,
        created_at TEXT,
        updated_at TEXT,
        published_at TEXT
      )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_sites_owner ON sites(owner_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status)`,
      `CREATE INDEX IF NOT EXISTS idx_sites_public ON sites(is_public, status)`,
    ],
  },

  site_pages: {
    name: "site_pages",
    owner: "api-dev",
    purpose: "Сторінка сайту: Page Builder-конфіг, статус публікації, порядок.",
    create: `CREATE TABLE IF NOT EXISTS site_pages (
        id TEXT PRIMARY KEY,
        site_id TEXT NOT NULL,
        slug TEXT NOT NULL,
        title TEXT NOT NULL,
        page_data TEXT DEFAULT '{}',
        order_index INTEGER DEFAULT 0,
        status TEXT DEFAULT 'draft',
        meta TEXT DEFAULT '{}',
        created_at TEXT,
        updated_at TEXT,
        published_at TEXT,
        FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE CASCADE
      )`,
    indexes: [
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_pages_slug ON site_pages(site_id, slug)`,
      `CREATE INDEX IF NOT EXISTS idx_pages_site ON site_pages(site_id)`,
    ],
  },

  templates: {
    name: "templates",
    owner: "api-dev",
    purpose: "Шаблон сторінки або сайту: системний (`is_system`) або приватний користувача.",
    create: `CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        thumbnail TEXT,
        config TEXT NOT NULL,
        is_system INTEGER DEFAULT 0,
        owner_id INTEGER,
        tags TEXT DEFAULT '[]',
        created_at TEXT
      )`,
    indexes: [
      `CREATE INDEX IF NOT EXISTS idx_templates_type ON templates(type, is_system)`,
      `CREATE INDEX IF NOT EXISTS idx_templates_owner ON templates(owner_id)`,
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

// ── Колонки з DDL ────────────────────────────────────────────────────────

/** Колонка, виведена з `create`. */
export interface DeclaredColumn {
  name: string;
  type: string;
}

/** `PRIMARY KEY`, `FOREIGN KEY`, `UNIQUE`, `CHECK`, `CONSTRAINT` — не колонки. */
const TABLE_CONSTRAINT_RE = /^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)\b/i;

const COLUMN_RE = /^["`[]?([A-Za-z_][A-Za-z0-9_]*)["`\]]?\s+([A-Za-z]+)/;

/** Розбиває тіло `CREATE TABLE` по комах верхнього рівня (дужки — не роздільник). */
function splitTopLevel(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/**
 * Колонки, оголошені в `create`, у порядку оголошення.
 *
 * Виводити їх із DDL, а не тримати окремим списком — свідомо: два списки
 * неминуче розходяться, і саме тому `scenarios-admin` колись «доростав»
 * колонками з помилки SQLite, а не з оголошення.
 */
export function declaredColumns(def: TableDefinition): DeclaredColumn[] {
  const open = def.create.indexOf("(");
  const close = def.create.lastIndexOf(")");
  if (open === -1 || close <= open) return [];

  const columns: DeclaredColumn[] = [];
  for (const chunk of splitTopLevel(def.create.slice(open + 1, close))) {
    const line = chunk.trim();
    if (!line || TABLE_CONSTRAINT_RE.test(line)) continue;
    const match = COLUMN_RE.exec(line);
    if (match) columns.push({ name: match[1], type: match[2].toUpperCase() });
  }
  return columns;
}

// ── Створення таблиць ────────────────────────────────────────────────────

/** Ім'я таблиці, яке можна підставити в SQL без ризику (реєстр — не ввід). */
const SAFE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_-]*$/;

/** Таблиці, для яких `ensureTables` уже відпрацював у цьому інстансі воркера. */
const ensured = new WeakMap<D1Database, Set<string>>();

/**
 * Гарантує наявність таблиць (і їхніх колонок).
 *
 * Ідемпотентна й безпечна на живій базі: тільки `CREATE TABLE IF NOT EXISTS` і
 * добір відсутніх колонок через `ALTER TABLE … ADD COLUMN`. Існуючі дані не
 * чіпаються, зайві колонки не видаляються, типи не змінюються.
 *
 * Повторні виклики в межах одного інстансу воркера нічого не коштують —
 * результат запам'ятовується на об'єкті `db`.
 */
export async function ensureTables(db: D1Database, names: readonly TableName[]): Promise<void> {
  let done = ensured.get(db);
  if (!done) {
    done = new Set<string>();
    ensured.set(db, done);
  }

  for (const name of names) {
    if (done.has(name)) continue;

    const def = tableDefinition(name);
    if (!def) {
      throw new Error(
        `D1: таблиця «${name}» не оголошена. Додай її в packages/shared/src/database/tables.ts.`,
      );
    }
    if (!SAFE_NAME_RE.test(def.name)) {
      throw new Error(`D1: ім'я таблиці «${def.name}» непридатне для SQL.`);
    }

    await db.prepare(def.create).run();
    for (const column of await missingColumns(db, def)) {
      await db
        .prepare(`ALTER TABLE "${def.name}" ADD COLUMN ${column.name} ${column.type} DEFAULT NULL`)
        .run();
    }
    for (const index of def.indexes ?? []) {
      await db.prepare(index).run();
    }

    done.add(name);
  }
}

/**
 * Колонки, яких у наявній таблиці немає.
 *
 * Спершу питаємо саму базу (`PRAGMA table_info`), бо `ALTER TABLE` на кожну
 * оголошену колонку — це N запитів, які щоразу падають із «duplicate column».
 * Якщо прагма недоступна — пробуємо всі: зайвий `ALTER` відсіється нижче.
 */
async function missingColumns(db: D1Database, def: TableDefinition): Promise<DeclaredColumn[]> {
  const declared = declaredColumns(def);

  let existing = new Set<string>();
  try {
    const result = await db.prepare(`PRAGMA table_info("${def.name}")`).all<{ name: string }>();
    existing = new Set((result.results ?? []).map((row) => row.name));
  } catch {
    return declared; // прагму не підтримано — хай вирішує сам ALTER
  }

  if (existing.size === 0) return declared; // таблиця щойно створена або прагма мовчить
  return declared.filter((column) => !existing.has(column.name));
}
