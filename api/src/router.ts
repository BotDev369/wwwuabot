import type { Env } from "./shared/types";
import { handleHealth } from "./controllers/health.controller";
import { handleAnalyze, handleAnalysisRead, handleSystems, handleCompare } from "./controllers/astrology.controller";
import { handleScenario } from "./controllers/scenarios.controller";
import { handleMyDates } from "./controllers/my-dates.controller";
import { handleSetupWebhook, handleWebhookInfo } from "./controllers/webhook.controller";
import { handleDbProxy } from "./controllers/db-proxy.controller";
import { handleAuthCheck } from "./controllers/auth-check.controller";

/**
 * Central router for the API worker.
 * Maps incoming requests to the appropriate controller.
 */
export async function handleRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  const url = new URL(request.url);
  const { pathname } = url;

  // ── Health ──────────────────────────────────────────────────────
  if (pathname === "/health") {
    return handleHealth();
  }

  // ── Admin: Telegram webhook management ──────────────────────────
  if (request.method === "GET" && pathname === "/setup-webhook") {
    return handleSetupWebhook(request, env);
  }
  if (request.method === "GET" && pathname === "/webhook-info") {
    return handleWebhookInfo(request, env);
  }

  // ── Admin: DB Proxy ────────────────────────────────────────────
  if (request.method === "POST" && pathname === "/db-proxy") {
    return handleDbProxy(request, env);
  }

  // ── Admin: Auth Check ──────────────────────────────────────────
  if (request.method === "GET" && (pathname === "/auth/check" || pathname === "/api/auth/check")) {
    return handleAuthCheck(request, env);
  }

  // ── MyDate: analysis by date ────────────────────────────────────
  if (pathname.startsWith("/api/mydate/analysis/")) {
    const date = decodeURIComponent(pathname.replace("/api/mydate/analysis/", ""));
    return handleAnalysisRead(request, env, date);
  }

  // ── MyDate: analyze (POST) ──────────────────────────────────────
  if (pathname === "/api/mydate/analyze" && request.method === "POST") {
    return handleAnalyze(request, env);
  }

  // ── MyDate: systems registry ────────────────────────────────────
  if (pathname === "/api/mydate/systems") {
    return handleSystems(env);
  }

  // ── MyDate: compare (POST) ──────────────────────────────────────
  if (pathname === "/api/mydate/compare" && request.method === "POST") {
    return handleCompare(request, env);
  }

  // ── Scenario by slug ────────────────────────────────────────────
  if (pathname.startsWith("/api/scenario/")) {
    const slug = decodeURIComponent(pathname.replace("/api/scenario/", ""));
    return handleScenario(request, env, slug);
  }

  // ── My-Dates CRUD ───────────────────────────────────────────────
  if (pathname === "/api/my-dates") {
    return handleMyDates(request, env);
  }

  // ── 404 ─────────────────────────────────────────────────────────
  return new Response("Not Found", { status: 404 });
}
