import * as Sentry from "@sentry/cloudflare";
import { sentryOptions } from "@wwwuabot/shared/observability/sentry";
import { handleRequest } from "./api/router";
import { handleQueue } from "./api/queue/queue.handler";
import type { Env } from "./shared/types/env";
import type { LogMessage } from "./shared/types/log";
import type { MessageBatch } from "@cloudflare/workers-types";

/**
 * Бот-воркер: webhook від Telegram (`fetch`) + споживач черги логів (`queue`).
 *
 * `Sentry.withSentry` обгортає весь handler, тому необроблені винятки з обох
 * шляхів потрапляють у Sentry. Без секрету `SENTRY_DSN` опції — `undefined`,
 * і SDK не робить нічого (див. `@wwwuabot/shared/observability/sentry`).
 * Помилки, які grammY ловить сам, звітує `bot.catch` у `core/bot.ts`.
 */
export default Sentry.withSentry<Env, LogMessage>(
  (env: Env) => sentryOptions(env) satisfies Sentry.CloudflareOptions | undefined,
  {
    fetch: handleRequest,

    async queue(batch: MessageBatch<LogMessage>, env: Env): Promise<void> {
      await handleQueue(batch, env);
    },
  },
);
