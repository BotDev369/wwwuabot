/**
 * Логіка схеми: розбір колонок із DDL і створення таблиць.
 *
 * **Чому окремо від реєстру.** `tables.ts` — це дані: оголошення таблиць і їхні
 * `CREATE TABLE`. Коли поруч із ними живуть ще й `ensureTables`, `declaredColumns`
 * і `missingColumns`, файл переростає межу плавності (424 рядки — помилка
 * `npm run check:quality`), і його неможливо ні прочитати, ні змінити
 * впевнено. Поділ навмисно проходить по межі «дані / логіка»: реєстр лишається
 * єдиним місцем, де оголошена схема (це стереже `check:db`), а код, який її
 * застосовує, — тут.
 *
 * Функції працюють із тим самим `TableDefinition`, тож реєстр не знає про них
 * нічого: залежність одностороння (`ensure-tables` → `tables`), без циклів.
 *
 * @module @wwwuabot/shared/database/ensure-tables
 */

import { type TableDefinition, type TableName, tableDefinition } from "./tables";

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
