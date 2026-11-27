/**
 * Ручна перебудова пошуку — кнопка в адмінці.
 * Потрібна після контентних міграцій, де «збереження», яке переписало б індекс, не існує.
 *
 * @module api-dev/src/controllers/search.controller
 */

import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { rebuildSearchIndex } from "../services/search";
import { resolveAdminTenant } from "../shared/admin-tenant";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

/** `POST /api/admin/search/reindex` — перебудувати індекс і сказати, що в ньому. */
export async function handleSearchReindex(request: Request, env: Env): Promise<Response> {
  try {
    const tenant = await resolveAdminTenant(request, env);
    if (!tenant.ok) return tenant.response;

    const result = await rebuildSearchIndex(env, tenant.tenant.id, new URL(request.url).origin);
    return json({ ok: true, ...result });
  } catch (error: unknown) {
    apiLog.error("search reindex error", error);
    return json({ ok: false, error: "Не вдалося перебудувати пошук" }, 500);
  }
}
