import type { Env } from "./shared/types";
import { handleHealth } from "./controllers/health.controller";
import { handleAnalyze, handleAnalysisRead, handleSystems, handleCompare } from "./controllers/astrology.controller";
import { handleScenario } from "./controllers/scenarios.controller";
import { handleMyDates } from "./controllers/my-dates.controller";
import { handleSetupWebhook, handleWebhookInfo } from "./controllers/webhook.controller";
import { handleDbProxy } from "./controllers/db-proxy.controller";
import { handleWebhookInfo as handleBotWebhookInfo, handleSetupWebhook as handleBotSetupWebhook, handleDeleteWebhook, handleBotInfo } from "./controllers/bot-settings.controller";
// auth-check.controller — видалено ( замінено на cookie-based auth.controller)
import { handleLogin, handleLogout, handleAuthCheck as handleCookieAuthCheck, isAuthenticated } from "./controllers/auth.controller";
import {
  handleRead as handleScenarioAdminRead,
  handleWrite as handleScenarioAdminWrite,
  handleList as handleScenarioAdminList,
  handleReadAll as handleScenarioAdminReadAll,
  handleUpdate as handleScenarioAdminUpdate,
  handleDelete as handleScenarioAdminDelete,
} from "./controllers/scenarios-admin.controller";
import {
  handleRead as handlePortalRead,
  handleWrite as handlePortalWrite,
  handleList as handlePortalList,
  handleReadAll as handlePortalReadAll,
  handleUpdate as handlePortalUpdate,
  handleDelete as handlePortalDelete,
} from "./controllers/scenarios-portal.controller";
import {
  handleListUsers,
  handleReadUser,
  handleUpdateUser,
  handleDeleteUser,
  handleBlockUser,
  handleBulkUsers,
  handleUserMessage,
} from "./controllers/users.controller";

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

  // ── Admin: Telegram webhook management (legacy) ─────────────────
  if (request.method === "GET" && pathname === "/setup-webhook") {
    return handleSetupWebhook(request, env);
  }
  if (request.method === "GET" && pathname === "/webhook-info") {
    return handleWebhookInfo(request, env);
  }

  // ── Bot Settings API (нові ендпоїнти) ────────────────────────────
  if (pathname === "/api/bot/webhook-info" && request.method === "GET") {
    return handleBotWebhookInfo(request, env);
  }
  if (pathname === "/api/bot/setup-webhook" && request.method === "POST") {
    return handleBotSetupWebhook(request, env);
  }
  if (pathname === "/api/bot/delete-webhook" && request.method === "POST") {
    return handleDeleteWebhook(request, env);
  }
  if (pathname === "/api/bot/info" && request.method === "GET") {
    return handleBotInfo(request, env);
  }

  // ── Admin: DB Proxy ────────────────────────────────────────────
  if (request.method === "POST" && pathname === "/db-proxy") {
    return handleDbProxy(request, env);
  }

  // /auth/check — обробляється нижче (cookie-based)

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

  // ── Admin: Cookie Auth ─────────────────────────────────────────
  if (pathname === "/auth/login" && request.method === "POST") {
    return handleLogin(request, env);
  }
  if (pathname === "/auth/logout" && request.method === "POST") {
    return handleLogout();
  }
  if (pathname === "/auth/check") {
    return handleCookieAuthCheck(request, env);
  }

  // ── Admin-гейт ────────────────────────────────────────────────
  // Все під /api/admin/ і /api/portal/ вимагає валідної cookie-сесії
  // (тієї самої, що web-admin/worker.ts перевіряє перед проксюванням).
  // Потрібно, бо api/ має власний публічний URL і доступний напряму,
  // в обхід web-admin. Знайдено при аудиті 01.09.2026 (PROJECT_PLAN.md
  // → "Нові знахідки").
  if (pathname.startsWith("/api/admin/") || pathname.startsWith("/api/portal/")) {
    const authed = await isAuthenticated(request, env);
    if (!authed) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // ── Admin: Scenarios-Admin CRUD ────────────────────────────────
  if (pathname === "/api/admin/scenarios/read" && request.method === "POST") {
    return handleScenarioAdminRead(request, env);
  }
  if (pathname === "/api/admin/scenarios/write" && request.method === "POST") {
    return handleScenarioAdminWrite(request, env);
  }
  if (pathname === "/api/admin/scenarios/list" && request.method === "GET") {
    return handleScenarioAdminList(request, env);
  }
  if (pathname === "/api/admin/scenarios/read-all" && request.method === "POST") {
    return handleScenarioAdminReadAll(request, env);
  }
  if (pathname === "/api/admin/scenarios/update" && request.method === "POST") {
    return handleScenarioAdminUpdate(request, env);
  }
  if (pathname === "/api/admin/scenarios/delete" && request.method === "POST") {
    return handleScenarioAdminDelete(request, env);
  }

  // ── Portal: Scenarios CRUD (таблиця scenarios) ─────────────────
  if (pathname === "/api/portal/scenarios/read" && request.method === "POST") {
    return handlePortalRead(request, env);
  }
  if (pathname === "/api/portal/scenarios/write" && request.method === "POST") {
    return handlePortalWrite(request, env);
  }
  if (pathname === "/api/portal/scenarios/list" && request.method === "GET") {
    return handlePortalList(request, env);
  }
  if (pathname === "/api/portal/scenarios/read-all" && request.method === "POST") {
    return handlePortalReadAll(request, env);
  }
  if (pathname === "/api/portal/scenarios/update" && request.method === "POST") {
    return handlePortalUpdate(request, env);
  }
  if (pathname === "/api/portal/scenarios/delete" && request.method === "POST") {
    return handlePortalDelete(request, env);
  }

  // ── Admin: Users CRUD ──────────────────────────────────────────
  if (pathname === "/api/admin/users/list" && request.method === "GET") {
    return handleListUsers(request, env);
  }
  if (pathname === "/api/admin/users/read" && request.method === "POST") {
    return handleReadUser(request, env);
  }
  if (pathname === "/api/admin/users/update" && request.method === "POST") {
    return handleUpdateUser(request, env);
  }
  if (pathname === "/api/admin/users/delete" && request.method === "POST") {
    return handleDeleteUser(request, env);
  }
  if (pathname === "/api/admin/users/block" && request.method === "POST") {
    return handleBlockUser(request, env);
  }
  if (pathname === "/api/admin/users/bulk" && request.method === "POST") {
    return handleBulkUsers(request, env);
  }
  if (pathname === "/api/admin/users/message" && request.method === "POST") {
    return handleUserMessage(request, env);
  }

  // ── 404 ─────────────────────────────────────────────────────────
  return new Response("Not Found", { status: 404 });
}
