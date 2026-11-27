/**
 * Який проєкт обслуговує цей запит — одне рішення в одному місці.
 *
 * Ключ береться лише з підписаного `initData` (`start_param`). Для неголовного
 * проєкту він означає прохання, а не право: членство перевіряється тут.
 * Головний проєкт членства не потребує (D26).
 * @module api-dev/src/shared/tenant
 */

import type { Env } from "./types";
import { readVerifiedPayload } from "./identity";
import { tenantKeyFromStartParam, DEFAULT_TENANT_KEY } from "@wwwuabot/shared/tenants";
import {
  ensureDefaultTenant,
  isTenantMember,
  readTenantById,
  readTenantByKey,
  type Tenant,
} from "../services/tenants.service";

/** Звідки взято проєкт — для відповіді й для діагностики. */
export type TenantSource = "start" | "default";

/** Проєкт запиту разом із тим, як його обрано. */
export interface TenantContext extends Tenant {
  source: TenantSource;
}

/** Або проєкт, або готова відмова: 401 без підпису, 403 без членства, 404 без проєкту. */
export type TenantResolution =
  { ok: true; tenant: TenantContext } | { ok: false; response: Response };

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Визначає проєкт запиту.
 *
 * Порядок навмисний: спершу головний проєкт (він є завжди), потім — явний
 * ключ. Невідомий ключ — `404`, а не тихий відкат на головний: інакше друкарська
 * помилка в посиланні відкривала б чужий (хай і спільний) простір.
 */
export async function resolveTenant(request: Request, env: Env): Promise<TenantResolution> {
  const defaultId = await ensureDefaultTenant(env.DB);

  const payload = await readVerifiedPayload(request, env);
  const key = tenantKeyFromStartParam(payload?.params.start_param);

  if (!key || key === DEFAULT_TENANT_KEY) {
    const tenant = await readTenantById(env.DB, defaultId);
    if (!tenant) throw new Error("D1: default tenant vanished after creation.");
    return { ok: true, tenant: { ...tenant, source: "default" } };
  }

  const tenant = await readTenantByKey(env.DB, key);
  if (!tenant) return { ok: false, response: json({ error: "tenant_not_found" }, 404) };

  if (!payload) return { ok: false, response: json({ error: "Unauthorized" }, 401) };
  if (!(await isTenantMember(env.DB, tenant.id, payload.userId))) {
    return { ok: false, response: json({ error: "tenant_forbidden" }, 403) };
  }

  return { ok: true, tenant: { ...tenant, source: "start" } };
}
