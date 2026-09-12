import * as Sentry from "@sentry/cloudflare";
import { sentryOptions } from "@wwwuabot/shared/observability/sentry";
import { handleRequest } from "./router";
import { apiLog } from "./shared/logger";
import type { Env } from "./shared/types";

/**
 * API Worker — unified REST gateway for wwwuabot.
 *
 * All external endpoints live here (see AGENTS.md §3.2).
 * Individual controllers handle business logic; this file is
 * the single entry point that Cloudflare Workers calls.
 *
 * `Sentry.withSentry` тут рівно один раз і робить дві речі: ловить
 * необроблені винятки з будь-якого контролера та вирішує, чи взагалі
 * вмикатись. Без секрету `SENTRY_DSN` опції дорівнюють `undefined` — SDK
 * мовчки не робить нічого, тому деплой без секрету безпечний.
 * Деталі й політику даних див. `@wwwuabot/shared/observability/sentry`.
 */
export default Sentry.withSentry(
  // `satisfies` ловить розходження між нашим обʼєктом (shared навмисно
  // вільний від залежностей) і реальним типом опцій SDK.
  (env: Env) => sentryOptions(env) satisfies Sentry.CloudflareOptions | undefined,
  {
    async fetch(request: Request, env: Env): Promise<Response> {
      try {
        return await handleRequest(request, env);
      } catch (error) {
        // Назовні — жодних деталей: у повідомленні D1 бувають назви таблиць
        // і значення, а клієнт цей ендпоїнт не захищений. Деталі йдуть у
        // Workers Logs (`apiLog`) і в Sentry — там вони й потрібні.
        apiLog.error("unhandled request error", error);
        Sentry.captureException(error);
        return new Response(JSON.stringify({ error: "Internal error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    },
  },
);
