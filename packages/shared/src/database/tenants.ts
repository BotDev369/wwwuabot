/**
 * Головний проєкт: одна гарантія для `api-dev` і `bot-dev`.
 *
 * @module @wwwuabot/shared/database/tenants
 */

import { ensureTables } from "./ensure-tables";
import { DEFAULT_TENANT_KEY } from "../tenants/index";

/** Головний проєкт уже перевірили в цьому інстансі — окремо для кожної бази. */
const defaults = new WeakMap<D1Database, Promise<number>>();

/**
 * Гарантує, що головний проєкт існує, і повертає його номер.
 *
 * Ідемпотентна: спершу читає `main`, і лише якщо рядка немає — заводить його.
 * Провал не кешується, інакше одна збійна секунда D1 лишала б воркер без
 * проєкту до перезапуску інстансу.
 */
export function ensureDefaultTenant(db: D1Database): Promise<number> {
  const cached = defaults.get(db);
  if (cached) return cached;

  const task = (async () => {
    await ensureTables(db, ["tenants", "tenant_members"]);

    const existing = await db
      .prepare("SELECT id FROM tenants WHERE key = ?")
      .bind(DEFAULT_TENANT_KEY)
      .first<{ id: number }>();
    if (existing) return existing.id;

    // Назва = ключ, доки немає бренду: справжня назва приїде з налаштуваннями.
    await db
      .prepare("INSERT INTO tenants (key, name) VALUES (?, ?)")
      .bind(DEFAULT_TENANT_KEY, DEFAULT_TENANT_KEY)
      .run();

    const created = await db
      .prepare("SELECT id FROM tenants WHERE key = ?")
      .bind(DEFAULT_TENANT_KEY)
      .first<{ id: number }>();
    if (!created) throw new Error(`D1: default tenant "${DEFAULT_TENANT_KEY}" was not created.`);
    return created.id;
  })();

  task.catch(() => defaults.delete(db));
  defaults.set(db, task);
  return task;
}
