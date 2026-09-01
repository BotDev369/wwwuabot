import { handleRequest } from "./api/router";
import { handleQueue } from "./api/queue/queue.handler";
import type { Env } from "./shared/types/env";
import type { LogMessage } from "./shared/types/log";
import type { MessageBatch } from "@cloudflare/workers-types";

/**
 * Автоматичний setup webhook при першому запиті.
 * Перевіряє чи вебхук вказує на правильну URL, і оновлює якщо треба.
 */
async function ensureWebhook(env: Env): Promise<void> {
  if (!env.BOT_TOKEN) return;

  const correctUrl = "https://bot-dev.diskomate.workers.dev/webhook";

  try {
    // Перевіряємо поточний стан вебхука
    const infoRes = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getWebhookInfo`);
    const info = (await infoRes.json()) as any;
    const currentUrl = info?.result?.url || "";

    // Якщо URL правильний — нічого не робимо
    if (currentUrl === correctUrl) return;

    // Оновлюємо вебхук
    console.log(`[WEBHOOK] Updating: ${currentUrl} → ${correctUrl}`);
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: correctUrl }),
    });
    console.log("[WEBHOOK] Updated successfully");
  } catch (err) {
    console.error("[WEBHOOK] Auto-setup failed:", err);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Авто-оновлення вебхука в фоні (не блокує відповідь)
    ctx.waitUntil(ensureWebhook(env));
    return handleRequest(request, env, ctx);
  },

  async queue(
    batch: MessageBatch<LogMessage>,
    env: Env,
  ): Promise<void> {
    await handleQueue(batch, env);
  },
};
