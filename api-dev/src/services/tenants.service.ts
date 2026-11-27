/**
 * Проєкти: читання, заведення й членство — один шар над `tenants`.
 *
 * Рядок читають резолвер, адмінка й далі бот; три копії `SELECT … FROM tenants`
 * розійшлися б на першій правці. `ensureDefaultTenant` — гарантія, а не сід.
 *
 * @module api-dev/src/services/tenants
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { DEFAULT_TENANT_KEY, tenantKeyFromStartParam } from "@wwwuabot/shared/tenants";

/** Проєкт у тому вигляді, у якому його віддають назовні. */
export interface Tenant {
  id: number;
  key: string;
  name: string;
  status: string;
}

/** Проєкт разом із кількістю членів — для списку в панелі. */
export interface TenantWithMembers extends Tenant {
  members: number;
}

/** Результат заведення: або рядок, або причина відмови. */
export type CreateTenantResult =
  { ok: true; tenant: Tenant } | { ok: false; reason: "invalid-key" | "exists" };

/** Найдовша назва проєкту — та сама межа, що в заголовку панелі. */
const MAX_TENANT_NAME = 80;

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

    // Назва = ключ, доки немає бренду: справжню назву заведуть разом із
    // налаштуваннями проєкту, а порожня назва в панелі виглядала б помилкою.
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

/** Проєкт за номером; `null` — такого немає. */
export async function readTenantById(db: D1Database, id: number): Promise<Tenant | null> {
  return db
    .prepare("SELECT id, key, name, status FROM tenants WHERE id = ?")
    .bind(id)
    .first<Tenant>();
}

/** Проєкт за ключем; `null` — такого немає. */
export async function readTenantByKey(db: D1Database, key: string): Promise<Tenant | null> {
  return db
    .prepare("SELECT id, key, name, status FROM tenants WHERE key = ?")
    .bind(key)
    .first<Tenant>();
}

/** Усі проєкти — старший першим, із кількістю членів. */
export async function listTenants(db: D1Database): Promise<TenantWithMembers[]> {
  await ensureDefaultTenant(db);
  const result = await db
    .prepare(
      `SELECT t.id, t.key, t.name, t.status,
              (SELECT COUNT(*) FROM tenant_members m WHERE m.tenant_id = t.id) AS members
         FROM tenants t
        ORDER BY t.id`,
    )
    .all<TenantWithMembers>();
  return result.results ?? [];
}

/** Проєкти, у яких людина справді є членом (головний сюди не входить). */
export async function listUserTenants(db: D1Database, userId: number): Promise<Tenant[]> {
  const result = await db
    .prepare(
      `SELECT t.id, t.key, t.name, t.status
         FROM tenants t
         JOIN tenant_members m ON m.tenant_id = t.id
        WHERE m.user_id = ?
        ORDER BY t.id`,
    )
    .bind(userId)
    .all<Tenant>();
  return result.results ?? [];
}

/** Чи є людина членом проєкту. */
export async function isTenantMember(
  db: D1Database,
  tenantId: number,
  userId: number,
): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 AS present FROM tenant_members WHERE tenant_id = ? AND user_id = ?")
    .bind(tenantId, userId)
    .first<{ present: number }>();
  return row !== null;
}

/**
 * Заводить проєкт.
 *
 * Ключ нормалізується тим самим правилом, що й у deep link (`p_` не частина
 * ключа, а префікс адреси), тож «створив `p_shop`» і «відкрив `p_shop`»
 * означають одне й те саме. Порожня назва замінюється ключем: проєкт без назви
 * у списку панелі виглядав би як помилка.
 */
export async function createTenant(
  db: D1Database,
  rawKey: string,
  rawName: string,
): Promise<CreateTenantResult> {
  await ensureTables(db, ["tenants"]);

  const key = tenantKeyFromStartParam(`p_${rawKey.trim().toLowerCase()}`);
  if (!key) return { ok: false, reason: "invalid-key" };

  if (await readTenantByKey(db, key)) return { ok: false, reason: "exists" };

  const name = rawName.trim().slice(0, MAX_TENANT_NAME) || key;
  await db.prepare("INSERT INTO tenants (key, name) VALUES (?, ?)").bind(key, name).run();

  const tenant = await readTenantByKey(db, key);
  if (!tenant) throw new Error(`D1: tenant "${key}" was not created.`);
  return { ok: true, tenant };
}
