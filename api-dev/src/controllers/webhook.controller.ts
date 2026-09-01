import type { Env } from "../shared/types";

/**
 * Перевіряє що запит містить BOT_TOKEN в заголовку X-Bot-Token.
 * Використовується для setup-webhook та webhook-info ендпоїнтів,
 * щоб не використовувати ADMIN_SECRET (пароль адмінки).
 */
function checkBotToken(request: Request, env: Env): boolean {
  const token = request.headers.get("X-Bot-Token");
  if (!token || token !== env.BOT_TOKEN) {
    return false;
  }
  return true;
}

export async function handleSetupWebhook(request: Request, env: Env): Promise<Response> {
  if (!checkBotToken(request, env)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", message: "BOT_TOKEN required in X-Bot-Token header" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  if (!env.BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "BOT_TOKEN not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const webhookUrl = "https://bot-dev.diskomate.workers.dev/webhook";

    const deleteResponse = await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/deleteWebhook`,
    );
    const deleteResult = (await deleteResponse.json()) as any;

    const body: Record<string, unknown> = { url: webhookUrl };
    if (env.SECRET_TOKEN) {
      body.secret_token = env.SECRET_TOKEN;
    }
    const setResponse = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const setResult = (await setResponse.json()) as any;

    return new Response(
      JSON.stringify({ success: true, webhook_url: webhookUrl, delete_result: deleteResult, set_result: setResult }, null, 2),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleWebhookInfo(request: Request, env: Env): Promise<Response> {
  if (!checkBotToken(request, env)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized", message: "BOT_TOKEN required in X-Bot-Token header" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }
  if (!env.BOT_TOKEN) {
    return new Response(JSON.stringify({ error: "BOT_TOKEN not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/getWebhookInfo`);
    const result = await response.json();
    return new Response(JSON.stringify(result, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  }
}
