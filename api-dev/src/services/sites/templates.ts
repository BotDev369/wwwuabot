/**
 * Sites — CRUD шаблонів.
 *
 * Системний шаблон (`is_system = 1`) належить продукту, а не користувачу: його
 * видно всім, і його **не можна** ні змінити, ні видалити — тому `updateTemplate`
 * і `deleteTemplate` повертають `null`/`false` на системному, а не мовчки
 * правлять спільний контент.
 *
 * @module api-dev/src/services/sites/templates
 */

import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { Template, TemplateRow } from "@wwwuabot/shared/types/site";
import { toTemplate } from "@wwwuabot/shared/types/site";
import { ensureSitesTables } from "./schema";

// ── Templates CRUD ───────────────────────────────────────────

/** Створює шаблон. */
export async function createTemplate(
  db: D1Database,
  data: {
    name: string;
    description?: string;
    type: "site" | "page";
    thumbnail?: string;
    config: Record<string, unknown>;
    ownerId?: number;
    tags?: string[];
  },
): Promise<Template> {
  await ensureSitesTables(db);

  const id = crypto.randomUUID();
  const now = formatSqliteDatetime();

  await db
    .prepare(
      `INSERT INTO templates (id, name, description, type, thumbnail, config, is_system, owner_id, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    )
    .bind(
      id,
      data.name,
      data.description ?? null,
      data.type,
      data.thumbnail ?? null,
      JSON.stringify(data.config),
      data.ownerId ?? null,
      JSON.stringify(data.tags ?? []),
      now,
    )
    .run();

  return {
    id,
    name: data.name,
    description: data.description,
    type: data.type,
    thumbnail: data.thumbnail,
    config: data.config as unknown as Template["config"],
    isSystem: false,
    ownerId: data.ownerId,
    tags: data.tags ?? [],
    createdAt: now,
  };
}

/** Отримує шаблон за ID. */
export async function getTemplateById(db: D1Database, id: string): Promise<Template | null> {
  await ensureSitesTables(db);

  const row = await db
    .prepare("SELECT * FROM templates WHERE id = ?")
    .bind(id)
    .first<TemplateRow>();

  return row ? toTemplate(row) : null;
}

/** Отримує всі шаблони (system + user). */
export async function getTemplates(db: D1Database, userId?: number): Promise<Template[]> {
  await ensureSitesTables(db);

  let result;
  if (userId) {
    result = await db
      .prepare(
        "SELECT * FROM templates WHERE is_system = 1 OR owner_id = ? ORDER BY created_at DESC",
      )
      .bind(userId)
      .all<TemplateRow>();
  } else {
    result = await db
      .prepare("SELECT * FROM templates WHERE is_system = 1 ORDER BY created_at DESC")
      .all<TemplateRow>();
  }

  return (result.results ?? []).map(toTemplate);
}

/** Оновлює шаблон (тільки свої, не system). */
export async function updateTemplate(
  db: D1Database,
  id: string,
  data: Partial<Pick<Template, "name" | "description" | "thumbnail" | "config" | "tags">>,
): Promise<Template | null> {
  await ensureSitesTables(db);

  const template = await getTemplateById(db, id);
  if (!template || template.isSystem) return null;

  const updates: string[] = [];
  const values: (string | number | null)[] = [];

  if (data.name !== undefined) {
    updates.push("name = ?");
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push("description = ?");
    values.push(data.description ?? null);
  }
  if (data.thumbnail !== undefined) {
    updates.push("thumbnail = ?");
    values.push(data.thumbnail ?? null);
  }
  if (data.config !== undefined) {
    updates.push("config = ?");
    values.push(JSON.stringify(data.config));
  }
  if (data.tags !== undefined) {
    updates.push("tags = ?");
    values.push(JSON.stringify(data.tags));
  }

  if (updates.length === 0) return template;

  await db
    .prepare(`UPDATE templates SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...values, id)
    .run();

  return getTemplateById(db, id);
}

/** Видаляє шаблон (тільки свої, не system). */
export async function deleteTemplate(db: D1Database, id: string): Promise<boolean> {
  await ensureSitesTables(db);

  const template = await getTemplateById(db, id);
  if (!template || template.isSystem) return false;

  const result = await db.prepare("DELETE FROM templates WHERE id = ?").bind(id).run();

  return (result.meta?.changes ?? 0) > 0;
}
