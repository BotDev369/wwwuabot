/**
 * Проєкти: читання, заведення й членство — один шар над `tenants`.
 *
 * Рядок читають резолвер, адмінка й далі бот; три копії `SELECT … FROM tenants`
 * розійшлися б на першій правці. `ensureDefaultTenant` — гарантія, а не сід.
 *
 * @module api-dev/src/services/tenants
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import { ensureDefaultTenant, readTenantByKey } from "@wwwuabot/shared/database/tenants";
import { tenantKeyFromStartParam } from "@wwwuabot/shared/tenants";

// Читання проєктів і членства — спільні з ботом: друга копія SQL розійшлася б
// на першій правці (D27).
export {
  ensureDefaultTenant,
  isTenantMember,
  readTenantById,
  readTenantByKey,
} from "@wwwuabot/shared/database/tenants";

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
  ownerId?: number,
): Promise<CreateTenantResult> {
  await ensureTables(db, ["tenants", "tenant_members"]);

  const key = tenantKeyFromStartParam(`p_${rawKey.trim().toLowerCase()}`);
  if (!key) return { ok: false, reason: "invalid-key" };

  if (await readTenantByKey(db, key)) return { ok: false, reason: "exists" };

  const name = rawName.trim().slice(0, MAX_TENANT_NAME) || key;
  await db.prepare("INSERT INTO tenants (key, name) VALUES (?, ?)").bind(key, name).run();

  const tenant = await readTenantByKey(db, key);
  if (!tenant) throw new Error(`D1: tenant "${key}" was not created.`);

  // Без власника новий проєкт ніхто не відкриє в боті: членства немає ні в кого.
  if (ownerId !== undefined) {
    await db
      .prepare(
        `INSERT OR IGNORE INTO tenant_members (tenant_id, user_id, role) VALUES (?, ?, 'owner')`,
      )
      .bind(tenant.id, ownerId)
      .run();
  }
  return { ok: true, tenant };
}
