/**
 * Оголошення: власний список і публічна дошка.
 *
 * **Власник стоїть у самому запиті** (`WHERE owner_id = ?`), а не окремою
 * перевіркою «а це моє?»: перевірку легко забути на новому шляху, а умову в
 * `WHERE` — ні. З тієї ж причини немає різних відповідей для «немає» та
 * «чуже»: обидві 404, бо код відповіді теж витік (AGENTS.md §7).
 *
 * **Дошка читає те саме сховище, але іншим запитом.** У списку власника є
 * чернетки (`is_active = 0`), на дошці — тільки показане й лише від незаблокованих
 * людей: блокування — рішення платформи про людину, і воно не скасовується
 * жодним її прапорцем.
 *
 * @module api-dev/src/services/ads.service
 */

import type { Env } from "../shared/types";
import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { formatSqliteDatetime } from "@wwwuabot/shared/utils/datetime";
import { isAdKind, type Ad, type AdInput } from "@wwwuabot/shared/ads";

/** Стеля власного списку: дошка — не сховище архіву. */
const OWN_LIMIT = 200;

/** Скільки оголошень віддає дошка за раз і яка межа запиту. */
export const BOARD_PAGE_SIZE = 60;
const BOARD_PAGE_MAX = 120;

/** Колонки читаємо за іменами, а не `SELECT *` (AGENTS.md §7). */
const COLUMNS = "id, owner_id, kind, title, body, price, place, is_active, created_at, updated_at";

interface AdRecord {
  id: number;
  owner_id: number;
  kind: string;
  title: string | null;
  body: string | null;
  price: string | null;
  place: string | null;
  is_active: number | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Рядок бази → оголошення для клієнта. */
function toAd(row: AdRecord): Ad {
  return {
    id: Number(row.id),
    ownerId: Number(row.owner_id),
    // Невідомий вид із бази лишається **як є**: показ його не ламає
    // (`adKindLabel` повертає саме слово), а замінити його на «схоже» означало б
    // показати людині не те, що вона написала. Записати чужий вид неможливо —
    // це вже перевірив `validateAd`.
    kind: (isAdKind(row.kind) ? row.kind : String(row.kind)) as Ad["kind"],
    title: row.title ?? "",
    body: row.body ?? "",
    price: row.price ?? "",
    place: row.place ?? "",
    isActive: Number(row.is_active ?? 0) === 1,
    createdAt: row.created_at ?? "",
    updatedAt: row.updated_at ?? "",
  };
}

/** Скільки віддавати за запитом: сміття й перебір дають межі, а не помилку. */
export function clampBoardLimit(raw: unknown): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return BOARD_PAGE_SIZE;
  return Math.min(Math.floor(value), BOARD_PAGE_MAX);
}

export class AdsService {
  constructor(private env: Env) {}

  private async ensureSchema(): Promise<void> {
    await ensureTables(this.env.DB, ["ads"]);
  }

  /** Власні оголошення — разом із чернетками: людина має їх бачити. */
  async listOwn(ownerId: number): Promise<Ad[]> {
    await this.ensureSchema();

    const result = await this.env.DB.prepare(
      `SELECT ${COLUMNS} FROM ads WHERE owner_id = ? ORDER BY updated_at DESC, id DESC LIMIT ?`,
    )
      .bind(ownerId, OWN_LIMIT)
      .all<AdRecord>();

    return (result.results ?? []).map(toAd);
  }

  /** Одне власне оголошення; чужий номер поводиться як неіснуючий. */
  async readOwn(id: number, ownerId: number): Promise<Ad | null> {
    const row = await this.env.DB.prepare(
      `SELECT ${COLUMNS} FROM ads WHERE id = ? AND owner_id = ?`,
    )
      .bind(id, ownerId)
      .first<AdRecord>();

    return row ? toAd(row) : null;
  }

  /**
   * Запис: `id` є — правка свого, немає — нове.
   *
   * Повертає `null`, коли правка нічого не зачепила (немає рядка або він
   * чужий) — однакова відповідь на обидва випадки.
   */
  async save(ownerId: number, input: AdInput, id?: number): Promise<Ad | null> {
    await this.ensureSchema();

    const now = formatSqliteDatetime();
    const active = input.isActive ? 1 : 0;

    if (id !== undefined) {
      const result = await this.env.DB.prepare(
        `UPDATE ads SET kind = ?, title = ?, body = ?, price = ?, place = ?, is_active = ?,
                         updated_at = ?
          WHERE id = ? AND owner_id = ?`,
      )
        .bind(
          input.kind,
          input.title,
          input.body,
          input.price,
          input.place,
          active,
          now,
          id,
          ownerId,
        )
        .run();

      if ((result.meta?.changes ?? 0) === 0) return null;
      return await this.readOwn(id, ownerId);
    }

    const inserted = await this.env.DB.prepare(
      `INSERT INTO ads (owner_id, kind, title, body, price, place, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        ownerId,
        input.kind,
        input.title,
        input.body,
        input.price,
        input.place,
        active,
        now,
        now,
      )
      .run();

    const newId = inserted.meta?.last_row_id ?? 0;
    return await this.readOwn(newId, ownerId);
  }

  /** Видалення свого; `false` — рядка не було або він чужий. */
  async remove(id: number, ownerId: number): Promise<boolean> {
    await this.ensureSchema();

    const result = await this.env.DB.prepare("DELETE FROM ads WHERE id = ? AND owner_id = ?")
      .bind(id, ownerId)
      .run();

    return (result.meta?.changes ?? 0) > 0;
  }

  /** Дошка: показані оголошення від незаблокованих людей, свіжі — першими. */
  async board(limit: unknown = BOARD_PAGE_SIZE): Promise<Ad[]> {
    await this.ensureSchema();

    const result = await this.env.DB.prepare(
      `SELECT ${COLUMNS} FROM ads
        WHERE is_active = 1
          AND owner_id NOT IN (SELECT user_id FROM users WHERE is_blocked = 1)
        ORDER BY id DESC LIMIT ?`,
    )
      .bind(clampBoardLimit(limit))
      .all<AdRecord>();

    return (result.results ?? []).map(toAd);
  }
}
