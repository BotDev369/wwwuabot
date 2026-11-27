/**
 * Контролер дослідження: `GET /api/public/research` — каталог блоків.
 * Без перевірки власника: у каталозі немає ні імен, ні приватних сторінок.
 * Підпис `initData` лишається — гейт допуску стоїть перед роутером для всього `/api/`.
 *
 * @module api-dev/src/controllers/research.controller
 */

import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { readResearchCatalog } from "../services/research.service";
import { resolveTenant } from "../shared/tenant";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** `GET /api/public/research` — каталог або `null`, коли ще не засіяний. */
export async function handlePublicResearch(request: Request, env: Env): Promise<Response> {
  try {
    const tenant = await resolveTenant(request, env);
    if (!tenant.ok) return tenant.response;

    return json({ ok: true, catalog: await readResearchCatalog(env, tenant.tenant.id) });
  } catch (error) {
    apiLog.error("research catalog", error);
    return json({ ok: false, error: "Не вдалося прочитати каталог дослідження" }, 500);
  }
}
