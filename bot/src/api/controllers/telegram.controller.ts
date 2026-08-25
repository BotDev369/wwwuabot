import { webhookCallback } from "grammy";
import type { Env } from "../../shared/types/env";
import { createBot } from "../../core/bot";

export async function handleTelegramWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  // Перевірка секрету Telegram
  if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.SECRET_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  const bot = createBot(env);
  const handleUpdate = webhookCallback(bot, "cloudflare-mod");

  try {
    return await handleUpdate(request);
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        context: "webhook_fatal",
        message: String(error),
      })
    );
    // Telegram очікує 200, інакше буде retry
    return new Response("OK", { status: 200 });
  }
}