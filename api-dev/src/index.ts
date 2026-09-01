import { handleRequest } from "./router";
import type { Env } from "./shared/types";

/**
 * Авто-оновлення Telegram webhook при кожному запиті до api-dev.
 * Перевіряє чи webhook вказує на bot-dev, і оновлює якщо треба.
 * Виконується в фоні, не блокує відповідь.
 */
async function autoSetupWebhook(env: Env, ctx: ExecutionContext): Promise<void> {
  if (!env.BOT_TOKEN) return;

  const correctUrl = "https://bot-dev.diskomate.workers.dev/webhook";

  try {
    const infoRes = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getWebhookInfo`);
    const info = (await infoRes.json()) as any;
    const currentUrl = info?.result?.url || "";

    if (currentUrl === correctUrl) return;

    console.log(`[WEBHOOK] Auto-updating: ${currentUrl} → ${correctUrl}`);
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

/**
 * API Worker — unified REST gateway for wwwuabot.
 *
 * All external endpoints live here (see AGENTS.md §3.2).
 * Individual controllers handle business logic; this file is
 * the single entry point that Cloudflare Workers calls.
 */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Авто-оновлення вебхука в фоні
    ctx.waitUntil(autoSetupWebhook(env, ctx));
    return handleRequest(request, env);
  },
};

// 🤖 Qwen AI Agent Test: Direct push to main verified on 01.09.2026
