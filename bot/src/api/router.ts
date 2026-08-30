import { handleStatus } from "./controllers/status.controller";
import { handleSetupWebhook, handleWebhookInfo } from "./controllers/webhook.controller";
import { handleTelegramWebhook } from "./controllers/telegram.controller";
import { handleDbProxy } from "./controllers/db-proxy.controller";
import { handleAuthCheck } from "./controllers/auth-check.controller";
import type { Env } from "../shared/types/env";
import { checkAdminAuth, unauthorizedResponse } from "../modules/security/admin-auth";

export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/") {
    return handleStatus(env);
  }

  // ── Admin endpoints (зашифровані ADMIN_SECRET) ──
  if (request.method === "GET" && url.pathname === "/setup-webhook") {
    return handleSetupWebhook(request, env);
  }

  if (request.method === "GET" && url.pathname === "/webhook-info") {
    return handleWebhookInfo(request, env);
  }

  // ── Telegram webhook (SECRET_TOKEN) ──
  if (request.method === "POST" && url.pathname === "/webhook") {
    return handleTelegramWebhook(request, env);
  }

  // ── DB Proxy (ADMIN_SECRET) ──
  if (request.method === "POST" && url.pathname === "/db-proxy") {
    return handleDbProxy(request, env);
  }

  // ── Auth Check (ADMIN_SECRET) ──
  if (
    request.method === "GET" &&
    (url.pathname === "/auth/check" || url.pathname === "/api/auth/check")
  ) {
    if (!checkAdminAuth(request, env)) {
      return unauthorizedResponse();
    }
    return handleAuthCheck(request, env);
  }

  return new Response("Not Found", { status: 404 });
}
