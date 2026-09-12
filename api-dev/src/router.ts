import type { Env } from "./shared/types";
import { decodePathSegment } from "./shared/url";
import { handleHealth, handleDeepHealth } from "./controllers/health.controller";
import { handleAnalyze, handleAnalysisRead, handleSystems, handleCompare } from "./controllers/astrology.controller";
import { handleScenario } from "./controllers/scenarios.controller";
import { handleMyDates } from "./controllers/my-dates.controller";
import { handleWebhookInfo as handleBotWebhookInfo, handleSetupWebhook as handleBotSetupWebhook, handleDeleteWebhook, handleBotInfo } from "./controllers/bot-settings.controller";
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
  handleUserProfile,
  handleUpdateUser,
  handleDeleteUser,
  handleBlockUser,
  handleBulkUsers,
  handleUserMessage,
} from "./controllers/users.controller";
import {
  handleCreateSite,
  handleListSites,
  handleGetSite,
  handleUpdateSite,
  handleDeleteSite,
  handlePublishSite,
  handleUnpublishSite,
} from "./controllers/sites.controller";
import {
  handleCreatePage,
  handleListPages,
  handleUpdatePage,
  handleDeletePage,
  handlePublishPage,
} from "./controllers/site-pages.controller";
import {
  handleListTemplates,
  handleGetTemplate,
  handleCreateTemplate,
  handleUpdateTemplate,
  handleDeleteTemplate,
} from "./controllers/templates.controller";
import {
  handleCatalogList,
  handleCatalogSite,
} from "./controllers/catalog.controller";
import {
  handlePendingSites,
  handleAllSites,
  handleApproveSite,
  handleRejectSite,
  handleCreateSystemTemplate,
  handleDeleteSystemTemplate,
} from "./controllers/sites-admin.controller";

/**
 * Префікси шляхів, доступ до яких вимагає адмінської cookie-сесії.
 *
 * Це ЄДИНЕ місце, де визначено межу адмін-доступу. Новий адмін-ендпоїнт
 * мусить бути під одним із цих префіксів — інакше він пройде **повз** гейт
 * і стане публічним мовчки (див. AGENTS.md §7). Межу перевіряє
 * `router.test.ts`.
 */
export const ADMIN_PATH_PREFIXES = [
  "/api/admin/",
  "/api/portal/",
  "/api/bot/",
] as const;

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
  // `/health` — живий воркер (без БД). `/health/deep` — живі залежності;
  // саме його має опитувати зовнішній монітор (див. health.controller.ts).
  if (pathname === "/health" || pathname === "/health/") {
    return handleHealth();
  }
  if (pathname === "/health/deep") {
    return handleDeepHealth(env);
  }

  // ── Єдиний адмін-гейт ─────────────────────────────────────────
  // Все під ADMIN_PATH_PREFIXES вимагає валідної cookie-сесії (тієї самої,
  // що web-admin/worker.ts перевіряє перед проксюванням). Потрібно, бо
  // api/ має власний публічний URL і доступний напряму, в обхід web-admin.
  //
  // Це ЄДИНИЙ спосіб авторизувати адмін-дію. Секрети в заголовках
  // (X-Admin-Secret, X-Bot-Token) видалені — див.
  // docs/CONSOLIDATION_PLAN.md §5.4.
  if (ADMIN_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const authed = await isAuthenticated(request, env);
    if (!authed) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // ── Bot Settings API ─────────────────────────────────────────────
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

  // ── MyDate: analysis by date ────────────────────────────────────
  if (pathname.startsWith("/api/mydate/analysis/")) {
    const date = decodePathSegment(pathname.replace("/api/mydate/analysis/", ""));
    if (date === null) return badRequest();
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
    const slug = decodePathSegment(pathname.replace("/api/scenario/", ""));
    if (slug === null) return badRequest();
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

  // ── Public: User Profile (for web-platform conditional rendering) ──
  if (pathname === "/api/user/profile" && request.method === "GET") {
    return handleUserProfile(request, env);
  }

  // ── Sites: User CRUD ──────────────────────────────────────────
  if (pathname === "/api/sites" && request.method === "POST") {
    return handleCreateSite(request, env);
  }
  if (pathname === "/api/sites" && request.method === "GET") {
    return handleListSites(request, env);
  }

  // ── Sites: /api/sites/:slug/publish & unpublish ────────────────
  if (pathname.match(/^\/api\/sites\/[^/]+\/publish$/) && request.method === "POST") {
    const slug = pathname.split("/")[3];
    return handlePublishSite(request, env, slug);
  }
  if (pathname.match(/^\/api\/sites\/[^/]+\/unpublish$/) && request.method === "POST") {
    const slug = pathname.split("/")[3];
    return handleUnpublishSite(request, env, slug);
  }

  // ── Sites: /api/sites/:slug/pages CRUD ─────────────────────────
  if (pathname.match(/^\/api\/sites\/[^/]+\/pages$/) && request.method === "POST") {
    const slug = pathname.split("/")[3];
    return handleCreatePage(request, env, slug);
  }
  if (pathname.match(/^\/api\/sites\/[^/]+\/pages$/) && request.method === "GET") {
    const slug = pathname.split("/")[3];
    return handleListPages(request, env, slug);
  }
  if (pathname.match(/^\/api\/sites\/[^/]+\/pages\/[^/]+$/) && request.method === "PUT") {
    const parts = pathname.split("/");
    return handleUpdatePage(request, env, parts[3], parts[5]);
  }
  if (pathname.match(/^\/api\/sites\/[^/]+\/pages\/[^/]+$/) && request.method === "DELETE") {
    const parts = pathname.split("/");
    return handleDeletePage(request, env, parts[3], parts[5]);
  }
  if (pathname.match(/^\/api\/sites\/[^/]+\/pages\/[^/]+\/publish$/) && request.method === "POST") {
    const parts = pathname.split("/");
    return handlePublishPage(request, env, parts[3], parts[5]);
  }

  // ── Sites: /api/sites/:slug (GET, PUT, DELETE) ─────────────────
  if (pathname.match(/^\/api\/sites\/[^/]+$/) && request.method === "GET") {
    const slug = pathname.split("/")[3];
    return handleGetSite(request, env, slug);
  }
  if (pathname.match(/^\/api\/sites\/[^/]+$/) && request.method === "PUT") {
    const slug = pathname.split("/")[3];
    return handleUpdateSite(request, env, slug);
  }
  if (pathname.match(/^\/api\/sites\/[^/]+$/) && request.method === "DELETE") {
    const slug = pathname.split("/")[3];
    return handleDeleteSite(request, env, slug);
  }

  // ── Templates: /api/templates ──────────────────────────────────
  if (pathname === "/api/templates" && request.method === "GET") {
    return handleListTemplates(request, env);
  }
  if (pathname === "/api/templates" && request.method === "POST") {
    return handleCreateTemplate(request, env);
  }
  if (pathname.match(/^\/api\/templates\/[^/]+$/) && request.method === "GET") {
    const id = pathname.split("/")[3];
    return handleGetTemplate(request, env, id);
  }
  if (pathname.match(/^\/api\/templates\/[^/]+$/) && request.method === "PUT") {
    const id = pathname.split("/")[3];
    return handleUpdateTemplate(request, env, id);
  }
  if (pathname.match(/^\/api\/templates\/[^/]+$/) && request.method === "DELETE") {
    const id = pathname.split("/")[3];
    return handleDeleteTemplate(request, env, id);
  }

  // ── Catalog: /api/catalog ──────────────────────────────────────
  if (pathname === "/api/catalog" && request.method === "GET") {
    return handleCatalogList(request, env);
  }
  if (pathname.match(/^\/api\/catalog\/[^/]+$/) && request.method === "GET") {
    const slug = pathname.split("/")[3];
    return handleCatalogSite(request, env, slug);
  }

  // ── Admin: Sites Moderation ────────────────────────────────────
  if (pathname === "/api/admin/sites/pending" && request.method === "GET") {
    return handlePendingSites(request, env);
  }
  if (pathname === "/api/admin/sites" && request.method === "GET") {
    return handleAllSites(request, env);
  }
  if (pathname.match(/^\/api\/admin\/sites\/[^/]+\/approve$/) && request.method === "POST") {
    const slug = pathname.split("/")[4];
    return handleApproveSite(request, env, slug);
  }
  if (pathname.match(/^\/api\/admin\/sites\/[^/]+\/reject$/) && request.method === "POST") {
    const slug = pathname.split("/")[4];
    return handleRejectSite(request, env, slug);
  }

  // ── Admin: System Templates ────────────────────────────────────
  if (pathname === "/api/admin/templates" && request.method === "POST") {
    return handleCreateSystemTemplate(request, env);
  }
  if (pathname.match(/^\/api\/admin\/templates\/[^/]+$/) && request.method === "DELETE") {
    const id = pathname.split("/")[4];
    return handleDeleteSystemTemplate(request, env, id);
  }

  // ── 404 ─────────────────────────────────────────────────────────
  return new Response("Not Found", { status: 404 });
}

/**
 * 400 для некоректного кодування в шляху (див. `decodePathSegment`).
 *
 * Навмисно без деталей: кодують шлях клієнти, а не користувач, тож
 * підказувати нічого — досить того, що це помилка клієнта, а не збій.
 */
function badRequest(): Response {
  return new Response("Bad Request", { status: 400 });
}
