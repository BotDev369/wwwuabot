/**
 * Шляхи MyDate — одним модулем: чотири дії одного домену (аналіз на дату,
 * запит аналізу, реєстр систем, порівняння). У роутері вони займали чотири
 * блоки з коментарями й перетинали межу файлу (`AGENTS.md` §3).
 *
 * @module api-dev/src/routes/mydate
 */

import type { Env } from "../shared/types";
import { decodePathSegment } from "../shared/url";
import {
  handleAnalyze,
  handleAnalysisRead,
  handleCompare,
  handleDossier,
  handleSystems,
} from "../controllers/astrology.controller";

/** Повертає відповідь, якщо шлях належить MyDate, інакше `null`. */
export function matchMyDateRoute(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> | null {
  if (pathname.startsWith("/api/mydate/analysis/")) {
    const date = decodePathSegment(pathname.replace("/api/mydate/analysis/", ""));
    if (date === null) return Promise.resolve(new Response("Bad Request", { status: 400 }));
    return handleAnalysisRead(request, env, date);
  }
  if (pathname === "/api/mydate/analyze" && request.method === "POST") {
    return handleAnalyze(request, env);
  }
  if (pathname === "/api/mydate/systems") return handleSystems(env);
  if (pathname === "/api/mydate/dossier" && request.method === "POST") {
    return handleDossier(request);
  }
  if (pathname === "/api/mydate/compare" && request.method === "POST") {
    return handleCompare(request, env);
  }
  return null;
}
