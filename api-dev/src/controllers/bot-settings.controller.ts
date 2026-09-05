import type { Env } from "../shared/types";

/**
 * Отримання інформації про поточний вебхук
 */
export async function handleWebhookInfo(request: Request, env: Env): Promise<Response> {
  if (!env.BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "BOT_TOKEN not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getWebhookInfo`);
    const result: unknown = await response.json();
    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Встановлення вебхука на bot-dev
 */
export async function handleSetupWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "BOT_TOKEN not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const webhookUrl = "https://bot-dev.diskomate.workers.dev/webhook";

  try {
    // Спочатку видаляємо старий вебхук
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/deleteWebhook`);

    // Встановлюємо новий
    const body: Record<string, unknown> = { url: webhookUrl };
    if (env.SECRET_TOKEN) {
      body.secret_token = env.SECRET_TOKEN;
    }

    const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result: unknown = await response.json();

    return new Response(
      JSON.stringify({ success: true, webhook_url: webhookUrl, result }, null, 2),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Видалення вебхука
 */
export async function handleDeleteWebhook(request: Request, env: Env): Promise<Response> {
  if (!env.BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "BOT_TOKEN not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/deleteWebhook`);
    const result: unknown = await response.json();
    return new Response(JSON.stringify({ success: true, result }, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

/**
 * Отримання інформації про бота
 */
export async function handleBotInfo(request: Request, env: Env): Promise<Response> {
  if (!env.BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "BOT_TOKEN not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getMe`);
    const result: unknown = await response.json();
    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
