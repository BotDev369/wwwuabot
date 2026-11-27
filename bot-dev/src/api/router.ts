import { handleTelegramWebhook } from "./controllers/telegram.controller";
import { handleReportsRequest } from "./controllers/reports.controller";
import { handleBotChannel } from "./controllers/bot-channel.controller";
import { handleHealth } from "./controllers/health.controller";
import { BOT_CHANNEL_PATH } from "@wwwuabot/shared/security/bot-channel";
import type { Env } from "../shared/types/env";

/**
 * Bot HTTP router — only the Telegram webhook endpoint.
 *
 * Усі адмін-ендпоїнти живуть в `api-dev` за cookie-сесією
 * (`/api/bot/*`) — див. AGENTS.md §5.
 */
export async function handleRequest(
  request: Request,
  env: Env,
  _ctx: ExecutionContext,
): Promise<Response> {
  const url = new URL(request.url);

  // Liveness раніше за решту: без нього зламаний деплой бота не бачить ні
  // монітор, ні `check:deploy` — лише людина, якій бот мовчить.
  if (url.pathname === "/health" || url.pathname === "/health/") {
    return handleHealth();
  }

  if (request.method === "POST" && url.pathname === "/webhook") {
    return handleTelegramWebhook(request, env);
  }

  // Службовий канал CI: закритий ключем, тому окремий шлях, а не черга
  // апдейтів. Див. `docs/AGENT_REPORTS.md`.
  if (url.pathname === "/reports") {
    return handleReportsRequest(request, env);
  }

  // api-dev → bot: правка й видалення повідомлень. Підпис обов'язковий.
  if (request.method === "POST" && url.pathname === BOT_CHANNEL_PATH) {
    return handleBotChannel(request, env);
  }

  return new Response("Not Found", { status: 404 });
}
