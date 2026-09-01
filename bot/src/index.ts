import { handleRequest } from "./api/router";
import { handleQueue } from "./api/queue/queue.handler";
import type { Env } from "./shared/types/env";
import type { LogMessage } from "./shared/types/log";
import type { MessageBatch } from "@cloudflare/workers-types";

export default {
  fetch: handleRequest,

  async queue(
    batch: MessageBatch<LogMessage>,
    env: Env,
  ): Promise<void> {
    await handleQueue(batch, env);
  },
};

// 🤖 Qwen AI Agent Test: Direct push to main verified on 01.09.2026
