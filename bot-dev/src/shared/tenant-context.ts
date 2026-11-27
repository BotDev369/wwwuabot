/**
 * Який проєкт обслуговує цей чат: вибір deep-link'ом, збережений між
 * апдейтами, `main` — типовий (D28).
 *
 * @module bot-dev/src/shared/tenant-context
 */

import { ensureTables } from "@wwwuabot/shared/database/ensure-tables";
import {
  ensureDefaultTenant,
  isTenantMember,
  readTenantById,
  readTenantByKey,
  type TenantRow,
} from "@wwwuabot/shared/database/tenants";
import { DEFAULT_TENANT_KEY, tenantKeyFromStartParam } from "@wwwuabot/shared/tenants";
import type { Env } from "./types/env";

/** Проєкт, у якому людина зараз працює. */
export type BotTenant = Pick<TenantRow, "id" | "key" | "name">;

/** Вибір за посиланням: або проєкт, або причина відмови. */
export type TenantPick =
  { ok: true; tenant: BotTenant } | { ok: false; reason: "unknown" | "forbidden" };

function brief(tenant: TenantRow): BotTenant {
  return { id: tenant.id, key: tenant.key, name: tenant.name };
}

/** Головний проєкт — те, що було в бота до появи маршрутизації. */
export async function defaultTenant(env: Env): Promise<BotTenant> {
  const id = await ensureDefaultTenant(env.DB);
  const tenant = await readTenantById(env.DB, id);
  if (!tenant) throw new Error("D1: default tenant vanished after creation.");
  return brief(tenant);
}

/**
 * Проєкт людини; без вибору — головний.
 *
 * Збережений вибір перевіряється щоразу: проєкт міг зникнути, членство —
 * відкликати. Тоді людина повертається в головний, а не отримує відмову на
 * кожен апдейт.
 */
export async function tenantForUser(env: Env, userId: number): Promise<BotTenant> {
  await ensureTables(env.DB, ["users"]);
  const fallback = await defaultTenant(env);

  const row = await env.DB.prepare("SELECT tenant_id FROM users WHERE user_id = ?")
    .bind(userId)
    .first<{ tenant_id: number | null }>();
  // `NULL` — це рядок, створений до появи колонки: для нього діє головний.
  if (!row?.tenant_id || row.tenant_id === fallback.id) return fallback;

  const tenant = await readTenantById(env.DB, row.tenant_id);
  if (!tenant || tenant.status !== "active") return fallback;
  if (!isPlatformOwner(env, userId) && !(await isTenantMember(env.DB, tenant.id, userId))) {
    return fallback;
  }
  return brief(tenant);
}

/**
 * Запам'ятати вибір людини; `main` теж запам'ятовується — це спосіб повернутись.
 *
 * Рядка `users` може ще не бути (перший же апдейт із посиланням): тоді вибір і
 * є створенням рядка. `UPDATE` без рядка тихо втратив би вибір.
 */
export async function rememberTenant(env: Env, userId: number, tenantId: number): Promise<void> {
  await ensureTables(env.DB, ["users"]);
  await env.DB.prepare(
    `INSERT INTO users (user_id, tenant_id, created_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(user_id) DO UPDATE SET tenant_id = excluded.tenant_id`,
  )
    .bind(userId, tenantId)
    .run();
}

/** Власник платформи входить у будь-який проєкт: панель і бот — його. */
export function isPlatformOwner(env: Env, userId: number): boolean {
  const ownerId = Number(env.ADMIN_TELEGRAM_ID);
  return Number.isInteger(ownerId) && ownerId > 0 && ownerId === userId;
}

/**
 * Проєкт із payload'а `/start`; `null` — це не ключ (payload бота: `inv-…`,
 * `mydate_…`, сторінка), і вибір не змінюється.
 */
export async function pickTenant(
  env: Env,
  userId: number,
  startParam: string,
): Promise<TenantPick | null> {
  const key = tenantKeyFromStartParam(startParam);
  if (!key) return null;

  if (key === DEFAULT_TENANT_KEY) return { ok: true, tenant: await defaultTenant(env) };

  const tenant = await readTenantByKey(env.DB, key);
  if (!tenant || tenant.status !== "active") return { ok: false, reason: "unknown" };
  if (!isPlatformOwner(env, userId) && !(await isTenantMember(env.DB, tenant.id, userId))) {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, tenant: brief(tenant) };
}
