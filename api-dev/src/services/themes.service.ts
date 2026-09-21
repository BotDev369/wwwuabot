/**
 * Схеми теми: власна бібліотека й спільна.
 *
 * **Власник стоїть у самому запиті** (`WHERE owner_id = ?`), а не окремою
 * перевіркою «а це моє?»: перевірку легко забути на новому шляху, а умову в
 * `WHERE` — ні. З тієї ж причини немає різних відповідей для «немає» та
 * «чуже»: обидві 404, бо код відповіді теж витік (AGENTS.md §7).
 *
 * **Спільна бібліотека читає те саме сховище іншим запитом**: лише
 * `is_public = 1` і лише від незаблокованих людей. Блокування — рішення
 * платформи про людину, і воно не скасовується її прапорцем.
 *
 * @module api-dev/src/services/themes.service
 */

import type { Env } from "../shared/types";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import type { ThemeScheme, ThemeSchemeInput } from "@wwwuabot/shared/themes";

/** Стеля власної бібліотеки: схема — набір, а не архів. */
const OWN_LIMIT = 200;

/** Скільки схем віддає спільна бібліотека за раз і яка межа запиту. */
export const SHARED_PAGE_SIZE = 60;
const SHARED_PAGE_MAX = 120;

/** Колонки читаємо за іменами, а не `SELECT *` (AGENTS.md §7). */
const COLUMNS =
  "id, owner_id, name, bg, text_color, accent, font, is_public, created_at, updated_at";

interface ThemeRecord {
  id: number;
  owner_id: number;
  name: string | null;
  bg: string | null;
  text_color: string | null;
  accent: string | null;
  font: string | null;
  is_public: number | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Рядок бази → схема для клієнта. */
function toScheme(row: ThemeRecord): ThemeScheme {
  return {
    id: Number(row.id),
    ownerId: Number(row.owner_id),
    name: row.name ?? "",
    bg: row.bg ?? "",
    text: row.text_color ?? "",
    accent: row.accent ?? "",
    font: row.font ?? "",
    isPublic: Number(row.is_public ?? 0) === 1,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

/** Скільки віддавати за запитом: сміття й перебір дають межі, а не помилку. */
export function clampSharedLimit(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return SHARED_PAGE_SIZE;
  return Math.min(Math.floor(value), SHARED_PAGE_MAX);
}

export class ThemesService {
  constructor(private env: Env) {}

  private async ensureSchema(): Promise<void> {
    await ensureTables(this.env.DB, ["theme_schemes"]);
  }

  /** Власні схеми — і закриті, і відкриті: людина має бачити всі свої. */
  async listOwn(ownerId: number): Promise<ThemeScheme[]> {
    await this.ensureSchema();

    const result = await this.env.DB.prepare(
      `SELECT ${COLUMNS} FROM theme_schemes WHERE owner_id = ?
        ORDER BY updated_at DESC, id DESC LIMIT ?`,
    )
      .bind(ownerId, OWN_LIMIT)
      .all<ThemeRecord>();

    return (result.results ?? []).map(toScheme);
  }

  /** Одна власна схема; чужий номер поводиться як неіснуючий. */
  async readOwn(id: number, ownerId: number): Promise<ThemeScheme | null> {
    const row = await this.env.DB.prepare(
      `SELECT ${COLUMNS} FROM theme_schemes WHERE id = ? AND owner_id = ?`,
    )
      .bind(id, ownerId)
      .first<ThemeRecord>();

    return row ? toScheme(row) : null;
  }

  /**
   * Запис: `id` є — правка своєї, немає — нова.
   *
   * Повертає `null`, коли правка нічого не зачепила (немає рядка або він
   * чужий) — однакова відповідь на обидва випадки.
   */
  async save(ownerId: number, input: ThemeSchemeInput, id?: number): Promise<ThemeScheme | null> {
    await this.ensureSchema();

    const now = formatSqliteDatetime();
    const isPublic = input.isPublic ? 1 : 0;

    if (id !== undefined) {
      const result = await this.env.DB.prepare(
        `UPDATE theme_schemes SET name = ?, bg = ?, text_color = ?, accent = ?, font = ?,
                                  is_public = ?, updated_at = ?
          WHERE id = ? AND owner_id = ?`,
      )
        .bind(
          input.name,
          input.bg,
          input.text,
          input.accent,
          input.font,
          isPublic,
          now,
          id,
          ownerId,
        )
        .run();

      if ((result.meta?.changes ?? 0) === 0) return null;
      return await this.readOwn(id, ownerId);
    }

    const inserted = await this.env.DB.prepare(
      `INSERT INTO theme_schemes (owner_id, name, bg, text_color, accent, font, is_public, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(ownerId, input.name, input.bg, input.text, input.accent, input.font, isPublic, now, now)
      .run();

    const newId = inserted.meta?.last_row_id ?? 0;
    return await this.readOwn(newId, ownerId);
  }

  /** Видалення своєї; `false` — рядка не було або він чужий. */
  async remove(id: number, ownerId: number): Promise<boolean> {
    await this.ensureSchema();

    const result = await this.env.DB.prepare(
      "DELETE FROM theme_schemes WHERE id = ? AND owner_id = ?",
    )
      .bind(id, ownerId)
      .run();

    return (result.meta?.changes ?? 0) > 0;
  }

  /** Спільна бібліотека: відкриті схеми від незаблокованих людей, свіжі — першими. */
  async listShared(limit: unknown = SHARED_PAGE_SIZE): Promise<ThemeScheme[]> {
    await this.ensureSchema();

    const result = await this.env.DB.prepare(
      `SELECT ${COLUMNS} FROM theme_schemes
        WHERE is_public = 1
          AND owner_id NOT IN (SELECT user_id FROM users WHERE is_blocked = 1)
        ORDER BY id DESC LIMIT ?`,
    )
      .bind(clampSharedLimit(limit))
      .all<ThemeRecord>();

    return (result.results ?? []).map(toScheme);
  }
}
