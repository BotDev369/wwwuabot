/**
 * Налаштування бота: вебхук та ім'я. Один домен — один модуль, щоб роутер
 * лишався списком доменів (`AGENTS.md` §3).
 *
 * @module api-dev/src/routes/bot-settings
 */

import type { Env } from "../shared/types";
import {
  handleWebhookInfo,
  handleSetupWebhook,
  handleDeleteWebhook,
  handleBotInfo,
} from "../controllers/bot-settings.controller";

/** `null` — шлях не наш; інакше — готова відповідь. */
export function matchBotSettingsRoute(
  request: Request,
  env: Env,
  pathname: string,
): Promise<Response> | null {
  if (pathname === "/api/bot/webhook-info" && request.method === "GET") {
    return handleWebhookInfo(request, env);
  }
  if (pathname === "/api/bot/setup-webhook" && request.method === "POST") {
    return handleSetupWebhook(request, env);
  }
  if (pathname === "/api/bot/delete-webhook" && request.method === "POST") {
    return handleDeleteWebhook(request, env);
  }
  if (pathname === "/api/bot/info" && request.method === "GET") {
    return handleBotInfo(request, env);
  }
  return null;
}
