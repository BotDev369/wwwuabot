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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** `GET /api/public/research` — каталог або `null`, коли ще не засіяний. */
export async function handlePublicResearch(_request: Request, env: Env): Promise<Response> {
  try {
    return json({ ok: true, catalog: await readResearchCatalog(env) });
  } catch (error) {
    apiLog.error("research catalog", error);
    return json({ ok: false, error: "Не вдалося прочитати каталог дослідження" }, 500);
  }
}
