import { handleTelegramWebhook } from "./controllers/telegram.controller";
import type { Env } from "../shared/types/env";

/**
 * Bot HTTP router — only the Telegram webhook endpoint.
 * All admin endpoints (setup-webhook, webhook-info, db-proxy, auth-check)
 * have been moved to the api/ worker.
 */
export async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "POST" && url.pathname === "/webhook") {
    return handleTelegramWebhook(request, env);
  }

  return new Response("Not Found", { status: 404 });
}
