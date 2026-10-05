/**
 * Дати людини — рядками в `my_dates`: ключ `(user_id, id)` робить `DELETE`
 * одним `DELETE`, а `UPDATE` не зачіпає сусідні дати (JSON вимагав «прочитав —
 * змінив — записав»). Перевірки «чи мій» немає: її виконнює сам `WHERE`, тож
 * відмова не стає відмовою від існування (§7).
 *
 * @module api-dev/src/services/my-dates.service
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { MyDate } from "@wwwuabot/shared/types/mydate";

export type MyDateItem = MyDate;

interface MyDateRow {
  id: string;
  date: string;
  type: string;
  name: string | null;
  tags: string | null;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Вид дати — **своїм словом**, а не ключем із переліку.
 *
 * `BUILTIN_TYPES` у спільному коді — це палітра для вибору в інтерфейсі, а не
 * дозволений набір: невідомий вид не губиться, а лишається тим, що написала
 * людина; порожній вид — це `other`, і лише він.
 */
export function normalizeType(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw.slice(0, DATE_TYPE_MAX) || "other";
}

/** Теги завжди масив: поламаний JSON у старому рядку не повинен ламати відповідь. */
function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === "string")
      : [];
  } catch {
    return [];
  }
}

function toItem(row: MyDateRow, userId: number): MyDateItem {
  return {
    id: row.id,
    user_id: userId,
    date: row.date,
    type: row.type,
    name: row.name ?? "",
    tags: parseTags(row.tags),
    notes: row.notes ?? "",
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

/** Стеля виду: він стоїть у рядку таблиці й у фільтрі, а не в абзаці. */
export const DATE_TYPE_MAX = 32;

const COLUMNS = "id, date, type, name, tags, notes, created_at, updated_at";

export async function ensureMyDatesSchema(db: D1Database): Promise<void> {
  await ensureTables(db, ["my_dates"]);
}

/** Дати людини за датою: раніше — раніші, інакше список «стрибає» сам собою. */
export async function listMyDates(db: D1Database, userId: number): Promise<MyDateItem[]> {
  await ensureMyDatesSchema(db);

  const result = await db
    .prepare(`SELECT ${COLUMNS} FROM my_dates WHERE user_id = ? ORDER BY date, id`)
    .bind(userId)
    .all<MyDateRow>();

  return (result.results ?? []).map((row) => toItem(row, userId));
}

/**
 * Додати дату.
 *
 * Номер (`id`) приходить від клієнта, а не народжується тут: дата — запис у
 * списку людини, і її номер лишається тим самим на всіх пристроях, де вона
 * заводилася. Ключ `(user_id, id)` тому й составний.
 */
export async function addMyDate(
  db: D1Database,
  userId: number,
  item: Omit<MyDateItem, "user_id" | "created_at" | "updated_at">,
): Promise<MyDateItem> {
  await ensureMyDatesSchema(db);

  const now = formatSqliteDatetime();
  await db
    .prepare(
      `INSERT INTO my_dates (user_id, id, date, type, name, tags, notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      userId,
      item.id,
      item.date,
      item.type,
      item.name,
      JSON.stringify(item.tags),
      item.notes,
      now,
      now,
    )
    .run();

  return { ...item, user_id: userId, created_at: now, updated_at: now };
}

/**
 * Правка дати — **тільки наявні поля**.
 *
 * Поля, яких у запиті немає, лишаються як були: клієнт надсилає форму, а не
 * повний рядок, і `PUT` без `notes` не повинен стирати нотатку.
 */
export async function updateMyDate(
  db: D1Database,
  userId: number,
  id: string,
  patch: Partial<Omit<MyDateItem, "user_id" | "id" | "created_at">>,
): Promise<MyDateItem | null> {
  await ensureMyDatesSchema(db);

  await db
    .prepare(
      `UPDATE my_dates
          SET date = COALESCE(?, date),
              type = COALESCE(?, type),
              name = COALESCE(?, name),
              tags = COALESCE(?, tags),
              notes = COALESCE(?, notes),
              updated_at = ?
        WHERE user_id = ? AND id = ?`,
    )
    .bind(
      patch.date ?? null,
      patch.type ?? null,
      patch.name ?? null,
      patch.tags ? JSON.stringify(patch.tags) : null,
      patch.notes ?? null,
      formatSqliteDatetime(),
      userId,
      id,
    )
    .run();

  // Відмова визначається **повторним читанням**, а не числом змінених рядків:
  // воно знову йде з `user_id` у `WHERE`, тож чужий номер поверне `null` так
  // само, як неіснуючий, і жодного «змінилося, але це не моє» не виникне.
  return readMyDate(db, userId, id);
}

export async function readMyDate(
  db: D1Database,
  userId: number,
  id: string,
): Promise<MyDateItem | null> {
  const row = await db
    .prepare(`SELECT ${COLUMNS} FROM my_dates WHERE user_id = ? AND id = ?`)
    .bind(userId, id)
    .first<MyDateRow>();

  return row ? toItem(row, userId) : null;
}

/**
 * Прибрати дати — скільки є, а не скільки попросили.
 *
 * Число реально видалених рядків повертається саме тому, що список на екрані
 * оновлюється за ним: запит на неіснуючу дату не має зменшувати лічильник.
 */
export async function deleteMyDates(
  db: D1Database,
  userId: number,
  ids: readonly string[],
): Promise<number> {
  await ensureMyDatesSchema(db);
  if (ids.length === 0) return 0;

  const placeholders = ids.map(() => "?").join(", ");
  const result = await db
    .prepare(`DELETE FROM my_dates WHERE user_id = ? AND id IN (${placeholders})`)
    .bind(userId, ...ids)
    .run();

  return result.meta?.changes ?? 0;
}
