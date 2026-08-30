import type { Env } from "../../shared/types/env";
import { checkAdminAuth, unauthorizedResponse } from "../../modules/security/admin-auth";

export async function handleSetupWebhook(request: Request, env: Env): Promise<Response> {
  if (!checkAdminAuth(request, env)) {
    return unauthorizedResponse();
  }
  try {
    const webhookUrl = "https://wwwuabot-dev.diskomate.workers.dev/webhook";

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
      JSON.stringify(
        {
          success: true,
          webhook_url: webhookUrl,
          delete_result: deleteResult,
          set_result: setResult,
        },
        null,
        2,
      ),
      {
        headers: { "Content-Type": "application/json" },
      },
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
