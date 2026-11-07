/**
 * Слова екранів платформи — `GET /api/screens/:key` (`docs/SCREEN_TEXTS.md`).
 *
 * **Навіщо окремо від роутера.** Роутер — список доменів, і його межа вже
 * впиралась у ліміт файлу: умова живе тут, а не серед усіх шляхів (AGENTS.md §3).
 *
 * @module api-dev/src/routes/screens
 */

import type { Env } from "../shared/types";
import { decodePathSegment } from "../shared/url";
import { handleScreenTexts } from "../controllers/screens.controller";

/** Обробити шлях екранів; `null` — це не він (роутер іде далі). */
export function matchScreensRoute(env: Env, pathname: string): Response | Promise<Response> | null {
  if (!pathname.startsWith("/api/screens/")) return null;
  const key = decodePathSegment(pathname.replace("/api/screens/", ""));
  if (key === null) return badRequest();
  return handleScreenTexts(env, key);
}

function badRequest(): Response {
  return new Response(JSON.stringify({ ok: false, error: "Bad screen key" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}
