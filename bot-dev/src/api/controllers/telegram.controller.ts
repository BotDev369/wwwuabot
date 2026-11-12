import { webhookCallback } from "grammy";
import type { Env } from "../../shared/types/env";
import { createBot } from "../../core/bot";
import { handleWidgetQuery } from "../../core/widget-query";

export async function handleTelegramWebhook(request: Request, env: Env): Promise<Response> {
  if (env.SECRET_TOKEN) {
    if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.SECRET_TOKEN) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const body = await request.text();

  // grammY 1.46 не знає Bot API 10.4: тап у віджеті обробляємо до нього.
  try {
    const update = JSON.parse(body) as { widget_query?: { id: string } };
    if (update.widget_query) {
      await handleWidgetQuery(env, update.widget_query as never);
      return new Response("OK", { status: 200 });
    }
  } catch {
    // Не JSON — далі розбере grammY.
  }

  const bot = createBot(env);
  const handleUpdate = webhookCallback(bot, "cloudflare-mod");

  try {
    return await handleUpdate(
      new Request(request.url, { method: "POST", headers: request.headers, body }),
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        context: "webhook_fatal",
        message: String(error),
      }),
    );
    return new Response("OK", { status: 200 });
  }
}
