import { handleTelegramWebhook } from "./controllers/telegram.controller";
import type { Env } from "../shared/types/env";

/**
 * Bot HTTP router — only the Telegram webhook endpoint.
 *
 * Усі адмін-ендпоїнти живуть в `api-dev` за cookie-сесією
 * (`/api/bot/*`) — див. docs/CONSOLIDATION_LOG.md §5.4.
 */
export async function handleRequest(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "POST" && url.pathname === "/webhook") {
    return handleTelegramWebhook(request, env);
  }

  return new Response("Not Found", { status: 404 });
}
