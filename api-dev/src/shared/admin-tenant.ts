/**
 * Чий контент показує адмінський запит: `?tenant=<key>`, без ключа — головний.
 *
 * @module api-dev/src/shared/admin-tenant
 */

import {
  ensureDefaultTenant,
  readTenantById,
  readTenantByKey,
  type TenantRow,
} from "@wwwuabot/shared/database/tenants";
import { tenantKeyFromStartParam } from "@wwwuabot/shared/tenants";
import type { Env } from "./types";

/** Проєкт запиту або готова відмова. */
export type AdminTenantResolution =
  { ok: true; tenant: TenantRow } | { ok: false; response: Response };

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** Проєкт із `?tenant=`; порожній параметр означає головний. */
export async function resolveAdminTenant(
  request: Request,
  env: Env,
): Promise<AdminTenantResolution> {
  const raw = new URL(request.url).searchParams.get("tenant")?.trim() ?? "";
  if (!raw) {
    const defaultId = await ensureDefaultTenant(env.DB);
    const tenant = await readTenantById(env.DB, defaultId);
    if (!tenant) throw new Error("D1: default tenant vanished after creation.");
    return { ok: true, tenant };
  }

  // Ключ нормалізується тим самим правилом, що й `p_<key>` у deep link.
  const key = tenantKeyFromStartParam(`p_${raw.toLowerCase()}`);
  if (!key) return { ok: false, response: json({ error: "invalid_tenant_key" }, 400) };

  const tenant = await readTenantByKey(env.DB, key);
  if (!tenant) return { ok: false, response: json({ error: "tenant_not_found" }, 404) };
  return { ok: true, tenant };
}
