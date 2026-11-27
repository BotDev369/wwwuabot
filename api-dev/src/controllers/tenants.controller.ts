/**
 * Проєкти: «який зараз», «які є» і «завести новий».
 *
 * `/api/user/tenant` віддає **лише проєкт запиту**, не список: список дав би
 * клієнту право обирати чуже. Адмін-шляхи вже під cookie-гейтом `/api/admin/`.
 *
 * @module api-dev/src/controllers/tenants.controller
 */

import { z } from "zod";
import type { Env } from "../shared/types";
import { readBody } from "../shared/body";
import { resolveTenant } from "../shared/tenant";
import { createTenant, listTenants } from "../services/tenants.service";

/** Тіло заведення проєкту: ключ обов'язковий, назва — ні. */
const createTenantBody = z.object({
  key: z.string(),
  name: z.string().optional(),
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** `GET /api/user/tenant` — проєкт поточного запиту. */
export async function handleCurrentTenant(request: Request, env: Env): Promise<Response> {
  const resolved = await resolveTenant(request, env);
  if (!resolved.ok) return resolved.response;

  const { id, key, name, source } = resolved.tenant;
  return json({ tenant: { id, key, name }, source });
}

/** `GET /api/admin/tenants` — усі проєкти з кількістю членів. */
export async function handleTenantsList(env: Env): Promise<Response> {
  return json({ tenants: await listTenants(env.DB) });
}

/** `POST /api/admin/tenants` — завести проєкт; `201` із рядком. */
export async function handleTenantCreate(request: Request, env: Env): Promise<Response> {
  const parsed = await readBody(request, createTenantBody);
  if (!parsed.ok) return parsed.response;

  const result = await createTenant(env.DB, parsed.body.key, parsed.body.name ?? "");
  if (!result.ok) {
    return result.reason === "invalid-key"
      ? json({ error: "invalid_tenant_key" }, 400)
      : json({ error: "tenant_key_taken" }, 409);
  }

  return json({ tenant: result.tenant }, 201);
}
