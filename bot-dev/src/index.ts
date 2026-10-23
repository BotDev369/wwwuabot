import * as Sentry from "@sentry/cloudflare";
import { sentryOptions } from "@wwwuabot/shared/observability/sentry";
import { handleRequest } from "./api/router";
import type { Env } from "./shared/types/env";

/**
 * Бот-воркер: webhook від Telegram (`fetch`).
 *
 * `Sentry.withSentry` обгортає handler; без `SENTRY_DSN` опції — `undefined`,
 * і SDK нічого не робить. Помилки grammY звітує `bot.catch` (`core/bot.ts`).
 * Черги вже немає: дії пишуться в D1 напряму (`modules/logging`).
 */
export default Sentry.withSentry<Env>(
  (env: Env) => sentryOptions(env) satisfies Sentry.CloudflareOptions | undefined,
  {
    fetch: handleRequest,
  },
);
