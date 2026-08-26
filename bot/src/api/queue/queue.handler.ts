import type { MessageBatch } from "@cloudflare/workers-types";
import type { Env } from "../../shared/types/env";
import type { LogMessage } from "../../shared/types/log";

export async function handleQueue(batch: MessageBatch<LogMessage>, env: Env): Promise<void> {
  const payload = batch.messages.map((msg) => msg.body);

  try {
    const response = await fetch(env.GAS_LOG_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`GAS Webhook failed with status ${response.status}`);
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        context: "gas_webhook_batch_failed",
        message: error instanceof Error ? error.message : String(error),
        batch_size: payload.length,
      }),
    );
    throw error; // Re-throw щоб Cloudflare зробив retry
  }
}
