/**
 * `GET /api/public/redirect?path=/стара-адреса` — куди веде стара адреса.
 * Питає веб-воркер (своєї бази він не має) і віддає `301` до застосунку. Без
 * авторизації: у відповіді лише шлях, а видимість сторінки вирішує вже
 * `handleScenario` (`docs/URL.md` §4).
 *
 * @module api-dev/src/controllers/redirect.controller
 */

import { toWebPath } from "@wwwuabot/shared/content";
import type { Env } from "../shared/types";
import { apiLog } from "../shared/logger";
import { redirectTargetFor } from "../services/aliases.service";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handlePublicRedirect(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).searchParams.get("path");

  try {
    const slug = await redirectTargetFor(env.DB, path);
    return json({ ok: true, to: slug === null ? null : toWebPath(slug) });
  } catch (e: unknown) {
    apiLog.error("Public redirect error", e);
    return json({ ok: false, error: "Не вдалося перевірити адресу" }, 500);
  }
}
