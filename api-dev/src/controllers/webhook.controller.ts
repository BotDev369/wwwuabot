import type { Env } from "../shared/types";
import { checkAdminAuth, unauthorizedResponse } from "../modules/security/admin-auth";

export async function handleSetupWebhook(request: Request, env: Env): Promise<Response> {
  if (!checkAdminAuth(request, env)) {
    return unauthorizedResponse();
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
  if (!checkAdminAuth(request, env)) {
    return unauthorizedResponse();
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
