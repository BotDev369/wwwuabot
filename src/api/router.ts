import { handleStatus } from "./controllers/status.controller";
import { handleSetupWebhook, handleWebhookInfo } from "./controllers/webhook.controller";
import { handleTelegramWebhook } from "./controllers/telegram.controller";
import { handleDbProxy } from "./controllers/db-proxy.controller";
import { handleMyDates } from "./controllers/my-dates.controller";
import { handleAuthCheck } from "./controllers/auth-check.controller";
import type { Env } from "../shared/types/env";

export async function handleRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/") {
    return handleStatus(env);
  }

  if (request.method === "GET" && url.pathname === "/setup-webhook") {
    return handleSetupWebhook(env);
  }

  if (request.method === "GET" && url.pathname === "/webhook-info") {
    return handleWebhookInfo(env);
  }

  if (request.method === "POST" && url.pathname === "/webhook") {
    return handleTelegramWebhook(request, env);
  }

  if (request.method === "POST" && url.pathname === "/db-proxy") {
    return handleDbProxy(request, env);
  }

  if (url.pathname === "/my-dates") {
    return handleMyDates(request, env);
  }

  if (request.method === "GET" && url.pathname === "/auth/check") {
    return handleAuthCheck(request, env);
  }

  return new Response("Not Found", { status: 404 });
}