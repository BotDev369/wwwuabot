/**
 * `GET /api/screens/:key` — тексти екрана платформи з його рядка `platform_pages`.
 *
 * Окремо від `/api/scenario/:slug`, бо там віддається **сторінка**, а екрану
 * потрібні лише слова (`docs/SCREEN_TEXTS.md`).
 *
 * @module api-dev/src/controllers/screens.controller
 */

import { isValidSlug } from "@wwwuabot/shared/content";
import { readScreenTexts } from "@wwwuabot/shared/screens";
import { apiLog } from "../shared/logger";
import type { Env } from "../shared/types";

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleScreenTexts(env: Env, key: string): Promise<Response> {
  const slug = key.trim();
  if (!isValidSlug(slug) || slug.includes("/")) {
    return json({ ok: false, error: "Bad screen key" }, 400);
  }

  try {
    // Читання не пише: жодного `ensureTables` тут немає (AGENTS.md §2).
    const row = await env.DB.prepare(
      `SELECT page_data FROM platform_pages
       WHERE slug = ? AND is_active = 1 AND owner_id IS NULL
       LIMIT 1`,
    )
      .bind(slug)
      .first<{ page_data: string | null }>();

    return json({ ok: true, key: slug, texts: readScreenTexts(row?.page_data ?? null) });
  } catch (e: unknown) {
    apiLog.error("Screen texts error", e);
    return json({ ok: false, error: "Internal error" }, 500);
  }
}
