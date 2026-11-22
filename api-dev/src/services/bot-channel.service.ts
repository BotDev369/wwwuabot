/**
 * Клієнт підписаного каналу `api-dev → bot`.
 *
 * Правку й видалення виконує бот: підпис рахується на фактичні тіло, метод і
 * шлях, тож підміна будь-чого повертає `401`.
 *
 * @module api-dev/src/services/bot-channel.service
 */

import {
  BOT_CHANNEL_HEADER,
  BOT_CHANNEL_PATH,
  signBotChannel,
  type BotChannelPayload,
} from "@wwwuabot/shared/security/bot-channel";
import type { Env } from "../shared/types";

export interface BotChannelResult {
  ok: boolean;
  status: number;
  message?: Record<string, unknown>;
  error?: string;
  description?: string;
}

interface BotChannelAnswer {
  ok?: boolean;
  message?: Record<string, unknown>;
  error?: string;
  description?: string;
}

export async function callBotChannel(
  env: Env,
  payload: BotChannelPayload,
): Promise<BotChannelResult> {
  if (!env.BOT || !env.BOT_TOKEN) {
    return { ok: false, status: 503, error: "channel_missing" };
  }

  const body = JSON.stringify(payload);
  const signature = await signBotChannel(env.BOT_TOKEN, {
    method: "POST",
    path: BOT_CHANNEL_PATH,
    body,
  });

  try {
    const response = await env.BOT.fetch(
      new Request(`https://bot${BOT_CHANNEL_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [BOT_CHANNEL_HEADER]: signature,
        },
        body,
      }),
    );
    const data = (await response.json().catch(() => null)) as BotChannelAnswer | null;
    if (!response.ok || !data?.ok) {
      return {
        ok: false,
        status: response.status,
        error: data?.error ?? "bot_error",
        description: data?.description,
      };
    }
    return { ok: true, status: response.status, message: data.message };
  } catch (error: unknown) {
    return { ok: false, status: 502, error: "channel_failed", description: String(error) };
  }
}
