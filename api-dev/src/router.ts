import type { Env } from "./shared/types";
import { decodePathSegment } from "./shared/url";
import { handleHealth, handleDeepHealth } from "./controllers/health.controller";
import {
  handleAnalyze,
  handleAnalysisRead,
  handleSystems,
  handleCompare,
} from "./controllers/astrology.controller";
import { handleScenario } from "./controllers/scenarios.controller";
import { handleMyDates } from "./controllers/my-dates.controller";
import {
  handleWebhookInfo as handleBotWebhookInfo,
  handleSetupWebhook as handleBotSetupWebhook,
  handleDeleteWebhook,
  handleBotInfo,
} from "./controllers/bot-settings.controller";
import {
  handleLogin,
  handleLogout,
  handleAuthCheck as handleCookieAuthCheck,
  isAuthenticated,
} from "./controllers/auth.controller";
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
  handleSetPlatformUsername,
  handleUpdateUser,
  handleDeleteUser,
  handleBlockUser,
  handleBulkUsers,
  handleUserMessage,
} from "./controllers/users.controller";

/**
 * Префікси шляхів, доступ до яких вимагає адмінської cookie-сесії.
 *
 * Це ЄДИНЕ місце, де визначено межу адмін-доступу. Новий адмін-ендпоїнт
 * мусить бути під одним із цих префіксів — інакше він пройде **повз** гейт
 * і стане публічним мовчки (див. AGENTS.md §7). Межу перевіряє
 * `router.test.ts`.
 */
export const ADMIN_PATH_PREFIXES = ["/api/admin/", "/api/portal/", "/api/bot/"] as const;

/**
 * Central router for the API worker.
 * Maps incoming requests to the appropriate controller.
 */
export async function handleRequest(request: Request, env: Env): Promise<Response> {
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
  // docs/HISTORY.md §5.4.
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

  // ── Portal: Scenarios CRUD (єдина таблиця scenarios) ───────────
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
  // Ідентичність — з підписаного `initData`, тож префікс не потребує
  // адмін-гейта. `/api/user/username` — дія користувача над **своїм** ім'ям.
  if (pathname === "/api/user/profile" && request.method === "GET") {
    return handleUserProfile(request, env);
  }
  if (pathname === "/api/user/username" && request.method === "POST") {
    return handleSetPlatformUsername(request, env);
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
