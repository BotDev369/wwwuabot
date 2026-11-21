/**
 * Набори для співставлення — **склад, а не значення**: у рядку лежать лише дати
 * й підписи, тож рівні рахуються щоразу заново й не старіють разом із ядром.
 *
 * @module api-dev/src/services/analysis-sets.service
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";

/** Один запис у наборі: дата й підпис, з яким її бачила людина. */
export interface AnalysisSetItem {
  readonly date: string;
  readonly name: string;
}

/** Набір людини: назва й склад. */
export interface AnalysisSet {
  readonly id: string;
  readonly name: string;
  readonly items: readonly AnalysisSetItem[];
  readonly created_at: string;
  readonly updated_at: string;
}

interface SetRow {
  id: string;
  name: string | null;
  items: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Поламаний JSON у старому рядку не повинен ламати список. */
function parseItems(raw: string | null): AnalysisSetItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((one): one is Record<string, unknown> => typeof one === "object" && one !== null)
      .map((one) => ({
        date: typeof one.date === "string" ? one.date : "",
        name: typeof one.name === "string" ? one.name : "",
      }))
      .filter((one) => one.date.length > 0);
  } catch {
    return [];
  }
}

function toSet(row: SetRow): AnalysisSet {
  return {
    id: row.id,
    name: row.name ?? "",
    items: parseItems(row.items),
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
  };
}

const COLUMNS = "id, name, items, created_at, updated_at";

export async function ensureAnalysisSetsSchema(db: D1Database): Promise<void> {
  await ensureTables(db, ["analysis_sets"]);
}

/** Набори людини: новіші — першими, бо список — це пам'ять, а не архів. */
export async function listAnalysisSets(db: D1Database, userId: number): Promise<AnalysisSet[]> {
  await ensureAnalysisSetsSchema(db);
  const result = await db
    .prepare(`SELECT ${COLUMNS} FROM analysis_sets WHERE user_id = ? ORDER BY created_at DESC, id`)
    .bind(userId)
    .all<SetRow>();
  return (result.results ?? []).map(toSet);
}

/** Запис набору: `id` приходить від клієнта, як і в дат. */
export async function saveAnalysisSet(
  db: D1Database,
  userId: number,
  set: { readonly id: string; readonly name: string; readonly items: readonly AnalysisSetItem[] },
): Promise<AnalysisSet> {
  await ensureAnalysisSetsSchema(db);
  const now = formatSqliteDatetime();
  const items = JSON.stringify(set.items);

  await db
    .prepare(
      `INSERT INTO analysis_sets (user_id, id, name, items, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, id) DO UPDATE SET name = excluded.name,
                                              items = excluded.items,
                                              updated_at = excluded.updated_at`,
    )
    .bind(userId, set.id, set.name, items, now, now)
    .run();

  return {
    id: set.id,
    name: set.name,
    items: set.items,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Оновити підпис у складах після перейменування або перенесення дати.
 *
 * Склад групи зберігає дату й підпис, а не номер рядка `my_dates`: саме тому
 * після правки людини без цього кроку група показувала старе ім'я. Оновлюємо
 * лише точний збіг дати й підпису та лише в наборах цієї людини.
 */
export async function renameAnalysisSetItem(
  db: D1Database,
  userId: number,
  from: AnalysisSetItem,
  to: AnalysisSetItem,
): Promise<number> {
  if (from.date === to.date && from.name === to.name) return 0;
  const sets = await listAnalysisSets(db, userId);
  let changed = 0;

  for (const set of sets) {
    let touched = false;
    const items = set.items.map((item) => {
      if (item.date !== from.date || item.name !== from.name) return item;
      touched = true;
      return { date: to.date, name: to.name };
    });
    if (!touched) continue;
    await saveAnalysisSet(db, userId, { id: set.id, name: set.name, items });
    changed++;
  }

  return changed;
}

/** Прибрати дати зі складів груп: видалена людина не лишається «мертвим» підписом. */
export async function removeAnalysisSetItems(
  db: D1Database,
  userId: number,
  removed: readonly AnalysisSetItem[],
): Promise<number> {
  if (removed.length === 0) return 0;
  const sets = await listAnalysisSets(db, userId);
  let changed = 0;

  for (const set of sets) {
    const items = set.items.filter(
      (item) => !removed.some((one) => one.date === item.date && one.name === item.name),
    );
    if (items.length === set.items.length) continue;
    await saveAnalysisSet(db, userId, { id: set.id, name: set.name, items });
    changed++;
  }

  return changed;
}

/** Прибрати набір: `WHERE` із `user_id` і є перевіркою «чи мій». */
export async function deleteAnalysisSet(
  db: D1Database,
  userId: number,
  id: string,
): Promise<number> {
  await ensureAnalysisSetsSchema(db);
  const result = await db
    .prepare("DELETE FROM analysis_sets WHERE user_id = ? AND id = ?")
    .bind(userId, id)
    .run();
  return result.meta?.changes ?? 0;
}
